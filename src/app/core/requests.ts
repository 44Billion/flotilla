import {writable} from "svelte/store"
import {
  batch,
  call,
  uniq,
  int,
  YEAR,
  WEEK,
  insertAt,
  sortBy,
  now,
  on,
  between,
  isDefined,
  filterVals,
  fromPairs,
} from "@welshman/lib"
import {
  EVENT_TIME,
  RELAY_INVITE,
  matchFilters,
  getTagValue,
  getAddress,
  isShareableRelayUrl,
  getRelaysFromList,
  sortEventsDesc,
} from "@welshman/util"
import type {TrustedEvent, Filter, List} from "@welshman/util"
import {load, request, mergeRepositoryUpdates} from "@welshman/net"
import type {RepositoryUpdate} from "@welshman/net"
import {repository, loadRelay, tracker} from "@welshman/app"
import {createScroller} from "@lib/html"
import {daysBetween} from "@lib/util"
import {getEventsForUrl} from "@app/core/state"

// Utils

export const makeFeed = ({
  url,
  filters,
  element,
  onBackwardExhausted,
  onForwardExhausted,
  at = now(),
}: {
  url: string
  filters: Filter[]
  element: HTMLElement
  onBackwardExhausted?: () => void
  onForwardExhausted?: () => void
  at?: number
}) => {
  const controller = new AbortController()
  const events = writable<TrustedEvent[]>([])

  let interval = int(WEEK)
  let buffer = sortEventsDesc(getEventsForUrl(url, filters))
  let backwardWindow = [at - interval, at]
  let forwardWindow = [at, at + interval]

  const insertIntoBuffer = (event: TrustedEvent) => {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].created_at > event.created_at) {
        buffer.splice(i, 0, event)
        return
      }
    }
    buffer.push(event)
  }

  // Batch-insert events into the visible store with a single update
  const insertEvents = (newEvents: TrustedEvent[]) => {
    const visible: TrustedEvent[] = []

    for (const event of newEvents) {
      if (between([backwardWindow[0], forwardWindow[1]], event.created_at)) {
        visible.push(event)
      } else {
        insertIntoBuffer(event)
      }
    }

    if (visible.length > 0) {
      events.update($events => {
        for (const event of visible) {
          let inserted = false
          for (let i = 0; i < $events.length; i++) {
            if ($events[i].created_at > event.created_at) {
              $events = insertAt(i, event, $events)
              inserted = true
              break
            }
          }
          if (!inserted) {
            $events = [...$events, event]
          }
        }
        return $events
      })
    }
  }

  const unsubscribers = [
    on(
      repository,
      "update",
      batch(150, (updates: RepositoryUpdate[]) => {
        const {added, removed} = mergeRepositoryUpdates(updates)

        if (removed.size > 0) {
          buffer = buffer.filter(e => !removed.has(e.id))
          events.update($events => $events.filter(e => !removed.has(e.id)))
        }

        const matching = added.filter(
          event => matchFilters(filters, event) && tracker.getRelays(event.id).has(url),
        )

        if (matching.length > 0) {
          insertEvents(matching)
        }
      }),
    ),
    on(tracker, "add", (id: string, trackerUrl: string) => {
      if (trackerUrl === url) {
        const event = repository.getEvent(id)

        if (event && matchFilters(filters, event)) {
          insertEvents([event])
        }
      }
    }),
  ]

  const loadTimeframe = async (since: number, until: number) => {
    const events = await request({
      relays: [url],
      autoClose: true,
      signal: controller.signal,
      filters: filters.map(filter => ({...filter, since, until})),
    })

    // If we found nothing, accelerate
    if (events.length === 0) {
      interval = Math.round(interval * 1.1)
    } else {
      interval = int(WEEK)
    }
  }

  const backwardScroller = createScroller({
    element,
    delay: 300,
    threshold: 5000,
    onScroll: () => {
      const [since, until] = backwardWindow

      backwardWindow = [since - interval, since]

      insertEvents(buffer.splice(0, 30))

      if (until > now() - int(2, YEAR)) {
        loadTimeframe(since, until)
      } else if (!buffer.some(e => e.created_at < at)) {
        backwardScroller.stop()
        onBackwardExhausted?.()
      }
    },
  })

  const forwardScroller = createScroller({
    element,
    reverse: true,
    delay: 300,
    threshold: 5000,
    onScroll: () => {
      const [since, until] = forwardWindow

      forwardWindow = [until, until + interval]

      insertEvents(buffer.splice(0, 30))

      if (until < now()) {
        loadTimeframe(since, until)
      } else if (!buffer.some(e => e.created_at > at)) {
        forwardScroller.stop()
        onForwardExhausted?.()
      }
    },
  })

  return {
    events,
    cleanup: () => {
      controller.abort()
      forwardScroller.stop()
      backwardScroller.stop()
      unsubscribers.forEach(call)
    },
  }
}

export const makeCalendarFeed = ({
  url,
  filters,
  element,
  onExhausted,
}: {
  url: string
  filters: Filter[]
  element: HTMLElement
  onExhausted?: () => void
}) => {
  const interval = int(5, WEEK)
  const controller = new AbortController()

  let exhaustedScrollers = 0
  let backwardWindow = [now() - interval, now()]
  let forwardWindow = [now(), now() + interval]

  const getStart = (event: TrustedEvent) => parseInt(getTagValue("start", event.tags) || "")

  const getEnd = (event: TrustedEvent) => parseInt(getTagValue("end", event.tags) || "")

  const events = writable(sortBy(getStart, getEventsForUrl(url, filters)))

  // Batch-insert calendar events into the store with a single update
  const insertEvents = (newEvents: TrustedEvent[]) => {
    const valid = newEvents.filter(e => !isNaN(getStart(e)) && !isNaN(getEnd(e)))
    if (valid.length === 0) return

    events.update($events => {
      for (const event of valid) {
        const start = getStart(event)
        const address = getAddress(event)

        let handled = false
        for (let i = 0; i < $events.length; i++) {
          if ($events[i].id === event.id) {
            handled = true
            break
          }
          if (getStart($events[i]) > start) {
            $events = insertAt(i, event, $events)
            handled = true
            break
          }
        }

        if (!handled) {
          $events = [...$events.filter(e => getAddress(e) !== address), event]
        }
      }
      return $events
    })
  }

  const unsubscribers = [
    on(
      repository,
      "update",
      batch(150, (updates: RepositoryUpdate[]) => {
        const {added, removed} = mergeRepositoryUpdates(updates)

        if (removed.size > 0) {
          events.update($events => $events.filter(e => !removed.has(e.id)))
        }

        const matching = added.filter(event => matchFilters(filters, event))

        if (matching.length > 0) {
          insertEvents(matching)
        }
      }),
    ),
    on(tracker, "add", (id: string, trackerUrl: string) => {
      if (trackerUrl === url) {
        const event = repository.getEvent(id)

        if (event && matchFilters(filters, event)) {
          insertEvents([event])
        }
      }
    }),
  ]

  const loadTimeframe = (since: number, until: number) => {
    const hashes = daysBetween(since, until).map(String)

    request({
      relays: [url],
      autoClose: true,
      signal: controller.signal,
      filters: [{kinds: [EVENT_TIME], "#D": hashes}],
    })
  }

  const maybeExhausted = () => {
    if (++exhaustedScrollers === 2) {
      onExhausted?.()
    }
  }

  const backwardScroller = createScroller({
    element,
    reverse: true,
    onScroll: () => {
      const [since, until] = backwardWindow

      backwardWindow = [since - interval, since]

      if (until > now() - int(2, YEAR)) {
        loadTimeframe(since, until)
      } else {
        backwardScroller.stop()
        maybeExhausted()
      }
    },
  })

  const forwardScroller = createScroller({
    element,
    onScroll: () => {
      const [since, until] = forwardWindow

      forwardWindow = [until, until + interval]

      if (until < now() + int(2, YEAR)) {
        loadTimeframe(since, until)
      } else {
        forwardScroller.stop()
        maybeExhausted()
      }
    },
  })

  return {
    events,
    cleanup: () => {
      controller.abort()
      forwardScroller.stop()
      backwardScroller.stop()
      unsubscribers.forEach(call)
    },
  }
}

// Domain specific

export const discoverRelays = (lists: List[]) =>
  Promise.all(
    uniq(lists.flatMap($l => getRelaysFromList($l)))
      .filter(isShareableRelayUrl)
      .map(url => loadRelay(url)),
  )

export const requestRelayClaim = async (url: string) => {
  const filters = [{kinds: [RELAY_INVITE], limit: 1}]
  const events = await load({filters, relays: [url]})

  if (events.length > 0) {
    return getTagValue("claim", events[0].tags)
  }
}

export const requestRelayClaims = async (urls: string[]) =>
  filterVals(
    isDefined,
    fromPairs(await Promise.all(urls.map(async url => [url, await requestRelayClaim(url)]))),
  )
