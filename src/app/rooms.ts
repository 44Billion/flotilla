import {
  ROOMS,
  ROOM_DELETE,
  ROOM_META,
  asDecryptedEvent,
  getGroupTags,
  getListTags,
  getRelayTagValues,
  getTagValues,
  isRelayUrl,
  makeRoomMeta,
  normalizeRelayUrl,
  readList,
  readRoomMeta,
} from "@welshman/util"
import type {List, PublishedRoomMeta, RelayProfile, RoomMeta, TrustedEvent} from "@welshman/util"
import {
  deriveEventsByIdByUrl,
  deriveItemsByKey,
  getter,
  makeDeriveItem,
  makeLoadItem,
} from "@welshman/store"
import {makeOutboxLoader, makeUserData, makeUserLoader, repository, tracker} from "@welshman/app"
import {derived} from "svelte/store"
import {
  addToMapKey,
  call,
  gte,
  identity,
  indexBy,
  max,
  partition,
  sortBy,
  spec,
  tryCatch,
  uniq,
  uniqBy,
} from "@welshman/lib"
import {load} from "@welshman/net"

export const ROOM = "h"

export const PROTECTED = ["-"]

export enum RoomType {
  Text = "text",
  Voice = "voice",
}

export type Room = PublishedRoomMeta & {
  id: string
  url: string
}

export const getRoomType = (room: RoomMeta): RoomType =>
  room.livekit ? RoomType.Voice : RoomType.Text

export const makeRoomId = (url: string, h: string) => `${url}'${h}`

export const isRoomId = (id: string) => id.includes("'")

export const splitRoomId = (id: string) => id.split("'")

export const hasNip29 = (relay?: RelayProfile) =>
  Boolean(relay?.supported_nips?.map?.(String)?.includes?.("29"))

export const roomMetaEventsByIdByUrl = deriveEventsByIdByUrl({
  tracker,
  repository,
  filters: [{kinds: [ROOM_META, ROOM_DELETE]}],
})

export const roomsByUrl = derived(roomMetaEventsByIdByUrl, roomMetaEventsByIdByUrl => {
  const result = new Map<string, Room[]>()

  for (const [url, events] of roomMetaEventsByIdByUrl.entries()) {
    const [metaEvents, deleteEvents] = partition(spec({kind: ROOM_META}), events.values())
    const deletedByH = new Map<string, number>()

    for (const event of deleteEvents) {
      for (const h of getTagValues("h", event.tags)) {
        deletedByH.set(h, max([deletedByH.get(h), event.created_at]))
      }
    }

    const metaById = new Map<string, Room>()

    for (const event of metaEvents) {
      const meta = tryCatch(() => readRoomMeta(event))

      if (!meta || gte(deletedByH.get(meta.h), meta.event.created_at)) {
        continue
      }

      const id = makeRoomId(url, meta.h)

      metaById.set(id, {...meta, url, id})
    }

    if (metaById.size > 0) {
      result.set(url, Array.from(metaById.values()))
    }
  }

  return result
})

export const roomsById = derived(roomsByUrl, roomsByUrl =>
  indexBy(room => room.id, Array.from(roomsByUrl.values()).flatMap(identity)),
)

export const getRoomsById = getter(roomsById)

export const getRoom = (id: string) => getRoomsById().get(id)

export const loadRoom = call(() => {
  const _fetchRoom = async (id: string) => {
    const [url, h] = splitRoomId(id)

    await load({
      relays: [url],
      filters: [
        {kinds: [ROOM_META], "#d": [h]},
        {kinds: [ROOM_DELETE], "#h": [h]},
      ],
    })
  }

  const _loadRoom = makeLoadItem(_fetchRoom, getRoom)

  return (url: string, h: string) => _loadRoom(makeRoomId(url, h))
})

export const deriveRoom = call(() => {
  const _deriveRoom = makeDeriveItem(roomsById, loadRoom)

  return (url: string, h: string) =>
    derived(
      _deriveRoom(makeRoomId(url, h)),
      room => (room || {url, id: makeRoomId(url, h), ...makeRoomMeta({h})}) as Room,
    )
})

export const displayRoom = (url: string, h: string) => getRoom(makeRoomId(url, h))?.name || h

export const roomComparator = (url: string) => (h: string) => displayRoom(url, h).toLowerCase()

export const deriveVoiceRooms = (url: string) =>
  derived(roomsById, $roomsById => {
    const set = new Set<string>()
    for (const room of $roomsById.values()) {
      if (room.url === url && room.livekit) {
        set.add(room.h)
      }
    }
    return set
  })

export const deriveOtherVoiceRooms = (url: string) =>
  derived([deriveVoiceRooms(url), deriveUserRooms(url)], ([$roomsWithLivekit, $userRooms]) => {
    const rooms: string[] = []

    for (const h of $roomsWithLivekit) {
      if (!$userRooms.includes(h)) {
        rooms.push(h)
      }
    }

    return sortBy(roomComparator(url), uniq(rooms))
  })

// User space/room lists

export const groupListsByPubkey = deriveItemsByKey({
  repository,
  filters: [{kinds: [ROOMS]}],
  getKey: list => list.event.pubkey,
  eventToItem: (event: TrustedEvent) => readList(asDecryptedEvent(event)),
})

export const getGroupListsByPubkey = getter(groupListsByPubkey)

export const getGroupList = (pubkey: string) => getGroupListsByPubkey().get(pubkey)

export const loadGroupList = makeLoadItem(makeOutboxLoader(ROOMS), getGroupList)

export const deriveGroupList = makeDeriveItem(groupListsByPubkey, loadGroupList)

export const groupListPubkeysByUrl = derived(groupListsByPubkey, $groupListsByPubkey => {
  const result = new Map<string, Set<string>>()

  for (const list of $groupListsByPubkey.values()) {
    const tags = getListTags(list)

    for (const url of getRelayTagValues(tags)) {
      addToMapKey(result, url, list.event.pubkey)
    }

    for (const tag of getGroupTags(tags)) {
      const url = tag[2] || ""

      if (isRelayUrl(url)) {
        addToMapKey(result, url, list.event.pubkey)
      }
    }
  }

  return result
})

export const deriveGroupListPubkeys = (url: string) =>
  derived(groupListPubkeysByUrl, $groupListPubkeysByUrl => new Set($groupListPubkeysByUrl.get(url)))

export const getSpaceUrlsFromGroupList = (groupList: List | undefined) => {
  const tags = getListTags(groupList)
  const urls = getRelayTagValues(tags)

  for (const tag of getGroupTags(tags)) {
    const url = tag[2] || ""

    if (isRelayUrl(url)) {
      urls.push(url)
    }
  }

  return uniqBy(normalizeRelayUrl, urls)
}

export const getSpaceRoomsFromGroupList = (url: string, groupList: List | undefined) => {
  const rooms: string[] = []

  for (const [_, h, relay] of getGroupTags(getListTags(groupList))) {
    if (url === relay) {
      rooms.push(h)
    }
  }

  return sortBy(roomComparator(url), uniq(rooms))
}

export const userGroupList = makeUserData(groupListsByPubkey, loadGroupList)

export const loadUserGroupList = makeUserLoader(loadGroupList)

export const userSpaceUrls = derived(userGroupList, getSpaceUrlsFromGroupList)

export const deriveUserRooms = (url: string) =>
  derived([userGroupList, roomsById], ([$userGroupList, $roomsById]) => {
    const rooms: string[] = []

    for (const h of getSpaceRoomsFromGroupList(url, $userGroupList)) {
      if ($roomsById.has(makeRoomId(url, h))) {
        rooms.push(h)
      }
    }

    return sortBy(roomComparator(url), rooms)
  })

export const deriveOtherRooms = (url: string) =>
  derived(
    [deriveUserRooms(url), deriveVoiceRooms(url), roomsByUrl],
    ([$userRooms, voiceRooms, $roomsByUrl]) => {
      const rooms: string[] = []

      for (const {h} of $roomsByUrl.get(url) || []) {
        if (!$userRooms.includes(h) && !voiceRooms.has(h)) {
          rooms.push(h)
        }
      }

      return sortBy(roomComparator(url), uniq(rooms))
    },
  )
