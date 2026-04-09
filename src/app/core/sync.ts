import {page} from "$app/stores"
import type {Unsubscriber} from "svelte/store"
import {last, call, ifLet, assoc, chunk, WEEK, ago} from "@welshman/lib"
import {PollResponse} from "nostr-tools/kinds"
import {merged} from "@welshman/store"
import {
  getListTags,
  getRelayTagValues,
  WRAP,
  ROOM_META,
  ROOM_DELETE,
  ROOM_ADMINS,
  ROOM_MEMBERS,
  ROOM_ADD_MEMBER,
  ROOM_REMOVE_MEMBER,
  ROOM_JOIN,
  ROOM_LEAVE,
  ROOM_CREATE_PERMISSION,
  RELAY_MEMBERS,
  RELAY_ADD_MEMBER,
  RELAY_REMOVE_MEMBER,
  isSignedEvent,
  unionFilters,
  getTagValue,
} from "@welshman/util"
import type {Filter, List, PublishedList, TrustedEvent} from "@welshman/util"
import {request, requestOne, Difference, DifferenceEvent} from "@welshman/net"
import {
  pubkey,
  loadRelay,
  userRelayList,
  userMessagingRelayList,
  loadRelayList,
  loadMessagingRelayList,
  loadBlossomServerList,
  loadBlockedRelayList,
  loadFollowList,
  loadMuteList,
  loadProfile,
  repository,
  shouldUnwrap,
  hasNegentropy,
} from "@welshman/app"
import {
  REACTION_KINDS,
  MESSAGE_KINDS,
  CONTENT_KINDS,
  INDEXER_RELAYS,
  loadSettings,
  loadGroupList,
  userSpaceUrls,
  userGroupList,
  decodeRelay,
  getSpaceUrlsFromGroupList,
  getSpaceRoomsFromGroupList,
  makeCommentFilter,
  loadFeedsForPubkey,
} from "@app/core/state"
import {hasBlossomSupport} from "@app/core/commands"
import {LIVEKIT_PARTICIPANTS} from "@app/call/voice"

// Utils

type SyncOpts = {
  url: string
  signal: AbortSignal
  filters: Filter[]
  onEvent?: (event: TrustedEvent) => void
}

const pullOneWithFallback = async (
  url: string,
  filter: Filter,
  signal: AbortSignal,
  onEvent?: (event: TrustedEvent) => void,
) => {
  if (signal.aborted) return

  const cachedEvents = repository.query([filter]).filter(isSignedEvent)
  const since = last(cachedEvents.slice(10))?.created_at || 0

  if (onEvent) {
    for (const event of cachedEvents) {
      onEvent(event)
    }
  }

  const shouldFallback =
    !hasNegentropy(url) ||
    (await new Promise(resolve => {
      if (signal.aborted) {
        resolve(false)
        return
      }

      // If teardown wins while the diff is opening, skip the fallback path and let cleanup stay in control.
      const diff = new Difference({relay: url, filter, events: cachedEvents, signal})

      diff.on(DifferenceEvent.Error, () => {
        resolve(true)
      })

      diff.on(DifferenceEvent.Close, () => {
        for (const ids of chunk(100, Array.from(diff.need))) {
          requestOne({relay: url, signal, autoClose: true, filters: [{ids}], onEvent})
        }

        resolve(false)
      })
    }))

  if (shouldFallback && !signal.aborted) {
    request({relays: [url], signal, autoClose: true, filters: [{since, ...filter}], onEvent})
  }
}

export const pullWithFallback = async ({url, signal, filters, onEvent}: SyncOpts) => {
  await loadRelay(url)

  if (signal.aborted) return

  await Promise.all(filters.map(filter => pullOneWithFallback(url, filter, signal, onEvent)))
}

const listen = ({url, signal, filters, onEvent}: SyncOpts) => {
  const relays = [url]

  request({relays, signal, filters: unionFilters(filters.map(assoc("limit", 0))), onEvent})
}

const pullAndListen = (options: SyncOpts) => {
  if (options.signal.aborted) return

  pullWithFallback(options)
  listen(options)
}

// Relays

const syncRelays = () => {
  for (const url of INDEXER_RELAYS) {
    loadRelay(url)
  }

  const unsubscribePage = page.subscribe($page => {
    if ($page.params.relay) {
      const url = decodeRelay($page.params.relay)

      loadRelay(url)
      hasBlossomSupport(url)
    }
  })

  const unsubscribeSpaceUrls = userSpaceUrls.subscribe(urls => {
    for (const url of urls) {
      loadRelay(url)
    }
  })

  return () => {
    unsubscribePage()
    unsubscribeSpaceUrls()
  }
}

// User data

const syncUserSpaceMembership = (url: string) => {
  const $pubkey = pubkey.get()
  const controller = new AbortController()

  if ($pubkey) {
    pullAndListen({
      url,
      signal: controller.signal,
      filters: [
        {kinds: [RELAY_ADD_MEMBER], "#p": [$pubkey], limit: 1},
        {kinds: [RELAY_REMOVE_MEMBER], "#p": [$pubkey], limit: 1},
        {kinds: [ROOM_CREATE_PERMISSION], "#p": [$pubkey], limit: 1},
      ],
    })
  }

  return () => controller.abort()
}

const syncUserRoomMembership = (url: string, h: string) => {
  const $pubkey = pubkey.get()
  const controller = new AbortController()

  if ($pubkey) {
    pullAndListen({
      url,
      signal: controller.signal,
      filters: [
        {kinds: [ROOM_ADD_MEMBER], "#p": [$pubkey], "#h": [h], limit: 1},
        {kinds: [ROOM_REMOVE_MEMBER], "#p": [$pubkey], "#h": [h], limit: 1},
      ],
    })
  }

  return () => controller.abort()
}

const syncUserData = () => {
  const unsubscribersByKey = new Map<string, Unsubscriber>()

  const syncGroupList = ($userGroupList: List | undefined) => {
    if ($userGroupList) {
      const keys = new Set<string>()

      for (const url of getSpaceUrlsFromGroupList($userGroupList)) {
        if (!unsubscribersByKey.has(url)) {
          unsubscribersByKey.set(url, syncUserSpaceMembership(url))
        }

        keys.add(url)

        for (const h of getSpaceRoomsFromGroupList(url, $userGroupList)) {
          const key = `${url}'${h}`

          if (!unsubscribersByKey.has(key)) {
            unsubscribersByKey.set(key, syncUserRoomMembership(url, h))
          }

          keys.add(key)
        }
      }

      for (const [key, unsubscribe] of unsubscribersByKey.entries()) {
        if (!keys.has(key)) {
          unsubscribersByKey.delete(key)
          unsubscribe()
        }
      }
    }
  }

  const syncRelayList = ($userRelayList: PublishedList | undefined) => {
    const pubkey = $userRelayList?.event?.pubkey

    if (!pubkey) return

    loadBlossomServerList(pubkey)
    loadBlockedRelayList(pubkey)
    loadFollowList(pubkey)
    loadGroupList(pubkey)
    loadMuteList(pubkey)
    loadProfile(pubkey)
    loadSettings(pubkey)
    loadFeedsForPubkey(pubkey)
  }

  const unsubscribeGroupList = merged([userGroupList]).subscribe(([$userGroupList]) => {
    syncGroupList($userGroupList)
  })

  const unsubscribeRelayList = merged([userRelayList]).subscribe(([$userRelayList]) => {
    syncRelayList($userRelayList)
  })

  return () => {
    unsubscribersByKey.forEach(call)
    unsubscribeGroupList()
    unsubscribeRelayList()
  }
}

// Spaces

const syncSpace = (url: string, rooms: string[]) => {
  const since = ago(WEEK)
  const seen = new Set<string>()
  const controller = new AbortController()

  const pullRoomContent = (room: string) => {
    if (!seen.has(room)) {
      seen.add(room)
      pullAndListen({
        url,
        signal: controller.signal,
        filters: [
          {kinds: [ROOM_META, ROOM_ADMINS, ROOM_MEMBERS], "#d": [room]},
          {kinds: MESSAGE_KINDS, since, "#h": [room]},
          makeCommentFilter(CONTENT_KINDS, {since, "#h": [room]}),
          {
            kinds: [ROOM_DELETE, ROOM_JOIN, ROOM_LEAVE, ROOM_ADD_MEMBER, ROOM_REMOVE_MEMBER],
            "#h": [room],
          },
          {kinds: [PollResponse], since},
        ],
      })
    }
  }

  for (const room of rooms) {
    pullRoomContent(room)
  }

  const relayKinds = [RELAY_MEMBERS, RELAY_ADD_MEMBER, RELAY_REMOVE_MEMBER]
  const roomMetaKinds = [ROOM_META, ROOM_ADMINS, ROOM_MEMBERS, LIVEKIT_PARTICIPANTS]
  const roomMemberKinds = [ROOM_DELETE, ROOM_JOIN, ROOM_LEAVE, ROOM_ADD_MEMBER, ROOM_REMOVE_MEMBER]

  pullAndListen({
    url,
    signal: controller.signal,
    filters: [
      {kinds: [...relayKinds, ...roomMetaKinds, ...roomMemberKinds, ...MESSAGE_KINDS]},
      makeCommentFilter(CONTENT_KINDS, {since}),
      {kinds: [PollResponse], since},
    ],
    onEvent: event => {
      if (event.kind === ROOM_META) {
        ifLet(getTagValue("d", event.tags), pullRoomContent)
      }
    },
  })

  listen({
    url,
    signal: controller.signal,
    filters: [{kinds: REACTION_KINDS}, {kinds: [PollResponse]}],
  })

  return () => controller.abort()
}

const syncSpaces = () => {
  const store = merged([userGroupList, page])
  const unsubscribersByUrl = new Map<string, Unsubscriber>()
  const roomsByUrl = new Map<string, string>()

  const unsubscribe = store.subscribe(([$userGroupList, $page]) => {
    const urls = new Set(getSpaceUrlsFromGroupList($userGroupList))
    const currentUrl = $page.params.relay ? decodeRelay($page.params.relay) : undefined

    if (currentUrl) {
      urls.add(currentUrl)
    }

    // Stop syncing removed spaces
    for (const [url, unsubscribe] of unsubscribersByUrl.entries()) {
      if (!urls.has(url)) {
        unsubscribersByUrl.delete(url)
        roomsByUrl.delete(url)
        unsubscribe()
      }
    }

    // Start or restart syncing for each space
    for (const url of urls) {
      const rooms = getSpaceRoomsFromGroupList(url, $userGroupList)

      if (currentUrl === url && $page.params.h && !rooms.includes($page.params.h)) {
        rooms.push($page.params.h)
      }

      const roomsKey = rooms.join(",")

      if (unsubscribersByUrl.has(url) && roomsByUrl.get(url) === roomsKey) continue

      // Tear down existing sync if rooms changed
      unsubscribersByUrl.get(url)?.()

      roomsByUrl.set(url, roomsKey)
      unsubscribersByUrl.set(url, syncSpace(url, rooms))
    }
  })

  return () => {
    for (const unsubscriber of unsubscribersByUrl.values()) {
      unsubscriber()
    }

    unsubscribe()
  }
}

// DMs

const syncDMRelay = (url: string, pubkey: string) => {
  const controller = new AbortController()

  pullAndListen({
    url,
    signal: controller.signal,
    filters: [{kinds: [WRAP], "#p": [pubkey]}],
  })

  return () => controller.abort()
}

const syncDMs = () => {
  const unsubscribersByUrl = new Map<string, Unsubscriber>()

  let currentPubkey: string | undefined
  let currentShouldUnwrap = false

  const unsubscribeAll = () => {
    for (const [url, unsubscribe] of unsubscribersByUrl.entries()) {
      unsubscribersByUrl.delete(url)
      unsubscribe()
    }
  }

  const syncPubkey = ($pubkey: string | undefined, $shouldUnwrap: boolean) => {
    if ($pubkey !== currentPubkey) {
      unsubscribeAll()
    }

    if ($pubkey && $shouldUnwrap) {
      loadRelayList($pubkey)
        .then(() => loadMessagingRelayList($pubkey))
        .then($l => {
          if ($l && currentPubkey === $pubkey && currentShouldUnwrap === $shouldUnwrap) {
            subscribeAll($pubkey, getRelayTagValues(getListTags($l)))
          }
        })
    }

    currentPubkey = $pubkey
    currentShouldUnwrap = $shouldUnwrap
  }

  const syncList = ($userMessagingRelayList: List | undefined) => {
    const $pubkey = pubkey.get()
    const $shouldUnwrap = shouldUnwrap.get()

    if ($pubkey && $shouldUnwrap) {
      subscribeAll($pubkey, getRelayTagValues(getListTags($userMessagingRelayList)))
    }
  }

  const subscribeAll = (pubkey: string, urls: string[]) => {
    // Start syncing newly added relays
    for (const url of urls) {
      if (!unsubscribersByUrl.has(url)) {
        unsubscribersByUrl.set(url, syncDMRelay(url, pubkey))
      }
    }

    // Stop syncing removed spaces
    for (const [url, unsubscribe] of unsubscribersByUrl.entries()) {
      if (!urls.includes(url)) {
        unsubscribersByUrl.delete(url)
        unsubscribe()
      }
    }
  }

  const unsubscribePubkey = merged([pubkey, shouldUnwrap]).subscribe(([$pubkey, $shouldUnwrap]) => {
    syncPubkey($pubkey, $shouldUnwrap)
  })

  // When user messaging relays change, update synchronization
  const unsubscribeList = merged([userMessagingRelayList]).subscribe(
    ([$userMessagingRelayList]) => {
      syncList($userMessagingRelayList)
    },
  )

  return () => {
    unsubscribeAll()
    unsubscribePubkey()
    unsubscribeList()
  }
}

// Merge all synchronization functions

export const syncApplicationData = () => {
  const unsubscribers = [syncRelays(), syncUserData(), syncSpaces(), syncDMs()]

  return () => unsubscribers.forEach(call)
}
