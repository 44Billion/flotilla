import {on, throttle, indexBy, fromPairs, batch} from "@welshman/lib"
import {throttled} from "@welshman/store"
import {
  ALERT_ANDROID,
  ALERT_EMAIL,
  ALERT_IOS,
  ALERT_STATUS,
  ALERT_WEB,
  APP_DATA,
  BLOSSOM_SERVERS,
  FOLLOWS,
  MESSAGING_RELAYS,
  MUTES,
  PROFILE,
  RELAY_ADD_MEMBER,
  RELAY_JOIN,
  RELAY_LEAVE,
  RELAY_MEMBERS,
  RELAY_REMOVE_MEMBER,
  RELAYS,
  ROOM_ADD_MEMBER,
  ROOM_CREATE_PERMISSION,
  ROOM_MEMBERS,
  ROOM_ADMINS,
  ROOM_META,
  ROOM_DELETE,
  ROOM_REMOVE_MEMBER,
  ROOMS,
  verifiedSymbol,
} from "@welshman/util"
import type {Zapper, TrustedEvent, RelayProfile} from "@welshman/util"
import type {RepositoryUpdate, WrapItem} from "@welshman/net"
import type {Handle, RelayStats} from "@welshman/app"
import {
  tracker,
  plaintext,
  repository,
  relaysByUrl,
  relayStatsByUrl,
  onRelayStats,
  handlesByNip05,
  zappersByLnurl,
  onZapper,
  onHandle,
  wrapManager,
  onRelay,
} from "@welshman/app"
import type {Unsubscriber} from "svelte/store"
import {db} from "@app/core/storage"

// Shared interval for all non-critical store flushes, so they batch on the same cadence
const FLUSH_INTERVAL = 3000

// Wraps a write callback to run during idle time (non-critical persistence)
const idleWrite = <T>(f: (xs: T[]) => void): ((xs: T[]) => void) => {
  if (typeof requestIdleCallback !== "undefined") {
    return (xs: T[]) => requestIdleCallback(() => f(xs))
  }

  return f
}

const kinds = {
  meta: [PROFILE, FOLLOWS, MUTES, RELAYS, BLOSSOM_SERVERS, MESSAGING_RELAYS, APP_DATA, ROOMS],
  alert: [ALERT_STATUS, ALERT_EMAIL, ALERT_WEB, ALERT_IOS, ALERT_ANDROID],
  space: [RELAY_ADD_MEMBER, RELAY_REMOVE_MEMBER, RELAY_MEMBERS, RELAY_JOIN, RELAY_LEAVE],
  room: [
    ROOM_META,
    ROOM_DELETE,
    ROOM_ADMINS,
    ROOM_MEMBERS,
    ROOM_ADD_MEMBER,
    ROOM_REMOVE_MEMBER,
    ROOM_CREATE_PERMISSION,
  ],
}

const shouldPersistEvent = (event: TrustedEvent) =>
  kinds.meta.includes(event.kind) ||
  kinds.alert.includes(event.kind) ||
  kinds.space.includes(event.kind) ||
  kinds.room.includes(event.kind)

type TrackerItem = {id: string; relays: string[]}

type PlaintextItem = {key: string; value: string}

const loadCriticalEvents = async () => {
  const table = db.table<TrustedEvent>("events")
  const initialEvents = await table.getAll()
  const keep: TrustedEvent[] = []
  const drop: string[] = []

  for (const event of initialEvents) {
    if (shouldPersistEvent(event)) {
      event[verifiedSymbol] = true
      keep.push(event)
    } else {
      drop.push(event.id)
    }
  }

  repository.load(keep)

  if (drop.length > 0) {
    void table.bulkDelete(drop)
  }
}

const syncEvents = () => {
  const table = db.table<TrustedEvent>("events")

  return on(
    repository,
    "update",
    batch(3000, async (updates: RepositoryUpdate[]) => {
      const add: TrustedEvent[] = []
      const remove = new Set<string>()

      for (const update of updates) {
        for (const event of update.added) {
          if (shouldPersistEvent(event)) {
            add.push(event)
            remove.delete(event.id)
          }
        }

        for (const id of update.removed) {
          remove.add(id)
        }
      }

      if (add.length > 0) {
        await table.bulkPut(add)
      }

      if (remove.size > 0) {
        await table.bulkDelete(remove)
      }
    }),
  )
}

const loadCriticalTracker = async () => {
  const table = db.table<TrackerItem>("tracker")
  const relaysById = new Map<string, Set<string>>()
  const stale: string[] = []

  for (const {id, relays} of await table.getAll()) {
    if (!repository.getEvent(id)) {
      stale.push(id)
      continue
    }

    relaysById.set(id, new Set(relays))
  }

  tracker.load(relaysById)

  if (stale.length > 0) {
    void table.bulkDelete(stale)
  }
}

const syncTracker = () => {
  const table = db.table<TrackerItem>("tracker")

  const _onAdd = async (ids: Iterable<string>) => {
    const items: TrackerItem[] = []

    for (const id of ids) {
      const event = repository.getEvent(id)

      if (!event || !shouldPersistEvent(event)) continue

      const relays = Array.from(tracker.getRelays(id))

      if (relays.length === 0) continue

      items.push({id, relays})
    }

    await table.bulkPut(items)
  }

  const _onRemove = async (ids: Iterable<string>) => {
    await table.bulkDelete(Array.from(ids))
  }

  const onAdd = batch(3000, _onAdd)
  const onRemove = batch(3000, _onRemove)
  const onLoad = () => _onAdd(tracker.relaysById.keys())
  const onClear = () => _onRemove(tracker.relaysById.keys())

  tracker.on("add", onAdd)
  tracker.on("remove", onRemove)
  tracker.on("load", onLoad)
  tracker.on("clear", onClear)

  return () => {
    tracker.off("add", onAdd)
    tracker.off("remove", onRemove)
    tracker.off("load", onLoad)
    tracker.off("clear", onClear)
  }
}

const loadCriticalRelays = async () => {
  const table = db.table<RelayProfile>("relays")

  relaysByUrl.set(indexBy(r => r.url, await table.getAll()))
}

const syncRelays = () => onRelay(batch(FLUSH_INTERVAL, idleWrite(db.table<RelayProfile>("relays").bulkPut)))

const initRelayStats = async () => {
  const table = db.table<RelayStats>("relayStats")

  relayStatsByUrl.set(indexBy(r => r.url, await table.getAll()))

  return onRelayStats(batch(FLUSH_INTERVAL, idleWrite(table.bulkPut)))
}

const initHandles = async () => {
  const table = db.table<Handle>("handles")

  handlesByNip05.set(indexBy(r => r.nip05, await table.getAll()))

  return onHandle(batch(FLUSH_INTERVAL, idleWrite(table.bulkPut)))
}

const initZappers = async () => {
  const table = db.table<Zapper>("zappers")

  zappersByLnurl.set(indexBy(z => z.lnurl, await table.getAll()))

  return onZapper(batch(FLUSH_INTERVAL, idleWrite(table.bulkPut)))
}

const initPlaintext = async () => {
  const table = db.table<PlaintextItem>("plaintext")
  const initialRecords = await table.getAll()

  plaintext.set(fromPairs(initialRecords.map(({key, value}) => [key, value])))

  return throttled(3000, plaintext).subscribe($plaintext => {
    table.bulkPut(Object.entries($plaintext).map(([key, value]) => ({key, value})))
  })
}

const initWrapManager = async () => {
  const table = db.table<WrapItem>("wrapManager")

  wrapManager.load(await table.getAll())

  const addOne = batch(3000, table.bulkPut)
  const removeOne = throttle(3000, table.bulkDelete)

  wrapManager.on("add", addOne)
  wrapManager.on("remove", removeOne)

  return () => {
    wrapManager.off("add", addOne)
    wrapManager.off("remove", removeOne)
  }
}

type StorageSync = {
  unsubscribe: Unsubscriber
  ready: Promise<void>
}

export const sync = (): StorageSync => {
  const unsubscribers: Unsubscriber[] = []
  const deferredTimers: ReturnType<typeof setTimeout>[] = []
  let stopped = false

  const addUnsubscriber = (unsubscriber: Unsubscriber) => {
    if (stopped) {
      unsubscriber()
    } else {
      unsubscribers.push(unsubscriber)
    }
  }

  const scheduleDeferred = (task: () => Promise<void>) => {
    const timeout = setTimeout(() => {
      if (stopped) return

      void task()
    }, 0)

    deferredTimers.push(timeout)
  }

  const ready = (async () => {
    await db.connect()

    await Promise.all([loadCriticalEvents(), loadCriticalRelays()])
    await loadCriticalTracker()

    addUnsubscriber(syncEvents())
    addUnsubscriber(syncTracker())
    addUnsubscriber(syncRelays())

    scheduleDeferred(async () => {
      addUnsubscriber(await initRelayStats())
    })

    scheduleDeferred(async () => {
      addUnsubscriber(await initHandles())
    })

    scheduleDeferred(async () => {
      addUnsubscriber(await initZappers())
    })

    scheduleDeferred(async () => {
      addUnsubscriber(await initPlaintext())
    })

    scheduleDeferred(async () => {
      addUnsubscriber(await initWrapManager())
    })
  })()

  const unsubscribe = () => {
    stopped = true

    for (const timeout of deferredTimers) {
      clearTimeout(timeout)
    }

    unsubscribers.forEach(unsubscriber => unsubscriber())
  }

  return {unsubscribe, ready}
}
