import {derived, writable} from "svelte/store"
import {
  ManagementMethod,
  RELAY_ADD_MEMBER,
  RELAY_JOIN,
  RELAY_LEAVE,
  RELAY_MEMBERS,
  RELAY_REMOVE_MEMBER,
  ROOM_ADD_MEMBER,
  ROOM_ADMINS,
  ROOM_CREATE_PERMISSION,
  ROOM_JOIN,
  ROOM_LEAVE,
  ROOM_MEMBERS,
  ROOM_REMOVE_MEMBER,
  getPubkeyTagValues,
  getTagValue,
  getTagValues,
  sortEventsAsc,
} from "@welshman/util"
import type {Filter, PublishedRoomMeta, TrustedEvent} from "@welshman/util"
import {first, memoize, sortBy, spec, uniq} from "@welshman/lib"
import {addRoomMember, manageRelay, pubkey, waitForThunkError} from "@welshman/app"
import {get} from "svelte/store"
import {deriveEventsForUrl, deriveRelaySignedEvents} from "@app/repository"
export const deriveSpaceMembers = (url: string) =>
  derived(deriveRelaySignedEvents(url, [{kinds: [RELAY_MEMBERS]}]), ([event]) =>
    uniq(getTagValues("member", event?.tags ?? [])),
  )

export const deriveRoomMembers = (url: string, h: string) => {
  const filters: Filter[] = [{kinds: [ROOM_MEMBERS], "#d": [h]}]

  return derived(deriveEventsForUrl(url, filters), ([event]) =>
    uniq(getPubkeyTagValues(event?.tags ?? [])),
  )
}

export type BannedPubkeyItem = {
  pubkey: string
  reason: string
}

export const spaceBannedPubkeyItems = new Map<string, BannedPubkeyItem[]>()

export const deriveSpaceBannedPubkeyItems = (url: string) => {
  const store = writable(spaceBannedPubkeyItems.get(url) || [])

  manageRelay(url, {method: ManagementMethod.ListBannedPubkeys, params: []}).then(res => {
    spaceBannedPubkeyItems.set(url, res.result)
    store.set(res.result)
  })

  return store
}

export const deriveRoomAdmins = (url: string, h: string) => {
  const filters: Filter[] = [{kinds: [ROOM_ADMINS], "#d": [h]}]

  return derived(deriveEventsForUrl(url, filters), $events => {
    const adminsEvent = first($events)

    if (adminsEvent) {
      return getPubkeyTagValues(adminsEvent.tags)
    }

    return []
  })
}

export const getRoomMembers = (_url: string, h: string, events: TrustedEvent[]) => {
  const members = new Set<string>()

  for (const event of sortEventsAsc(events)) {
    if (event.kind === ROOM_MEMBERS && getTagValue("d", event.tags) === h) {
      members.clear()

      for (const pubkey of uniq(getPubkeyTagValues(event.tags))) {
        members.add(pubkey)
      }

      continue
    }

    if (getTagValue("h", event.tags) !== h) {
      continue
    }

    const pubkeys = getPubkeyTagValues(event.tags)

    if (event.kind === ROOM_ADD_MEMBER) {
      for (const pubkey of pubkeys) {
        members.add(pubkey)
      }
    }

    if (event.kind === ROOM_REMOVE_MEMBER) {
      for (const pubkey of pubkeys) {
        members.delete(pubkey)
      }
    }
  }

  return Array.from(members)
}

// User membership status

export enum MembershipStatus {
  Initial,
  Pending,
  Granted,
}

export const deriveUserIsSpaceAdmin = memoize((url?: string) => {
  const store = writable(false)

  if (url) {
    manageRelay(url, {method: ManagementMethod.SupportedMethods, params: []}).then(res =>
      store.set(Boolean(res.result?.length)),
    )
  }

  return store
})

export const deriveUserSpaceMembershipStatus = (url: string) => {
  // Fetch member list and user add/remove events directly in this derivation.
  const memberListFilters: Filter[] = [{kinds: [RELAY_MEMBERS]}]
  const userEventFilters: Filter[] = [{kinds: [RELAY_ADD_MEMBER, RELAY_REMOVE_MEMBER]}]

  return derived(
    [
      pubkey,
      deriveRelaySignedEvents(url, memberListFilters),
      deriveRelaySignedEvents(url, userEventFilters),
      deriveEventsForUrl(url, [{kinds: [RELAY_JOIN, RELAY_LEAVE]}]),
      deriveUserIsSpaceAdmin(url),
    ],
    ([$pubkey, $memberListEvents, $userAddRemoveEvents, $joinLeaveEvents, $isAdmin]) => {
      // If admin, always granted.
      if ($isAdmin) {
        return MembershipStatus.Granted
      }

      const membersEvent = $memberListEvents.find(spec({kind: RELAY_MEMBERS}))
      const memberList = membersEvent ? uniq(getTagValues("member", membersEvent.tags)) : undefined

      let isMember = false

      if (memberList) {
        // Member list exists - check if user is in it.
        isMember = memberList.includes($pubkey!)
      } else {
        // No member list available - replay the user's add/remove history.
        for (const event of sortBy(e => e.created_at, $userAddRemoveEvents)) {
          if (event.pubkey !== $pubkey) {
            continue
          }

          if (event.kind === RELAY_ADD_MEMBER) {
            isMember = true
          } else if (event.kind === RELAY_REMOVE_MEMBER) {
            isMember = false
          }
        }
      }

      for (const event of $joinLeaveEvents) {
        // Join events indicate pending or granted status, leave resets to initial.
        if (event.pubkey !== $pubkey) {
          continue
        }

        if (event.kind === RELAY_JOIN) {
          return isMember ? MembershipStatus.Granted : MembershipStatus.Pending
        }

        if (event.kind === RELAY_LEAVE) {
          return MembershipStatus.Initial
        }
      }

      return isMember ? MembershipStatus.Granted : MembershipStatus.Initial
    },
  )
}

export const deriveUserIsRoomAdmin = (url: string, h: string) =>
  derived(
    [pubkey, deriveRoomAdmins(url, h), deriveUserIsSpaceAdmin(url)],
    ([$pubkey, $admins, $isSpaceAdmin]) => $isSpaceAdmin || $admins.includes($pubkey!),
  )

export const deriveUserRoomMembershipStatus = (url: string, h: string) => {
  // Fetch the room member list and the current user's add/remove events.
  const userEventFilters: Filter[] = [{kinds: [ROOM_ADD_MEMBER, ROOM_REMOVE_MEMBER], "#h": [h]}]
  const joinLeaveFilters: Filter[] = [{kinds: [ROOM_JOIN, ROOM_LEAVE], "#h": [h]}]

  return derived(
    [
      pubkey,
      deriveRoomMembers(url, h),
      deriveEventsForUrl(url, userEventFilters),
      deriveEventsForUrl(url, joinLeaveFilters),
      deriveUserIsRoomAdmin(url, h),
    ],
    ([$pubkey, $memberList, $userAddRemoveEvents, $joinLeaveEvents, $isAdmin]) => {
      // If admin of this room's space, always granted.
      if ($isAdmin) {
        return MembershipStatus.Granted
      }

      let isMember = false

      if ($memberList) {
        // Member list exists - check if user is in it.
        isMember = $memberList.includes($pubkey!)
      } else {
        // No member list available - replay the user's add/remove history.
        for (const event of sortEventsAsc($userAddRemoveEvents)) {
          if (event.pubkey !== $pubkey) {
            continue
          }

          if (event.kind === ROOM_ADD_MEMBER) {
            isMember = true
          } else if (event.kind === ROOM_REMOVE_MEMBER) {
            isMember = false
          }
        }
      }

      for (const event of $joinLeaveEvents) {
        // Join events indicate pending or granted status, leave resets to initial.
        if (event.pubkey !== $pubkey) {
          continue
        }

        if (event.kind === ROOM_JOIN) {
          return isMember ? MembershipStatus.Granted : MembershipStatus.Pending
        }

        if (event.kind === ROOM_LEAVE) {
          return MembershipStatus.Initial
        }
      }

      return isMember ? MembershipStatus.Granted : MembershipStatus.Initial
    },
  )
}

export const deriveUserCanCreateRoom = (url: string) => {
  const filters: Filter[] = [{kinds: [ROOM_CREATE_PERMISSION]}]

  return derived(
    [pubkey, deriveEventsForUrl(url, filters), deriveUserIsSpaceAdmin(url)],
    ([$pubkey, $events, $isAdmin]) => {
      for (const event of $events) {
        if (getPubkeyTagValues(event.tags).includes($pubkey!)) {
          return true
        }
      }

      return $isAdmin
    },
  )
}

export const addSpaceMembers = async (
  url: string,
  pubkeys: string[],
): Promise<string | undefined> => {
  const spaceMembers = get(deriveSpaceMembers(url))

  const results = await Promise.all(
    pubkeys
      .filter(pubkey => !spaceMembers || !spaceMembers.includes(pubkey))
      .map(pubkey =>
        manageRelay(url, {
          method: ManagementMethod.AllowPubkey,
          params: [pubkey],
        }),
      ),
  )

  for (const {error} of results) {
    if (error) {
      return error
    }
  }
}

export const addRoomMembers = async (
  url: string,
  room: PublishedRoomMeta,
  pubkeys: string[],
): Promise<string | undefined> => {
  const error = await addSpaceMembers(url, pubkeys)

  if (error) {
    return error
  }

  const errors = await Promise.all(
    pubkeys.map(pubkey => waitForThunkError(addRoomMember(url, room, pubkey))),
  )

  for (const error of errors) {
    if (error) {
      return error
    }
  }
}
