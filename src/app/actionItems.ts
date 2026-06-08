import {
  REPORT,
  ROOM_ADD_MEMBER,
  ROOM_JOIN,
  ROOM_LEAVE,
  ROOM_MEMBERS,
  ROOM_REMOVE_MEMBER,
  getPubkeyTagValues,
  getTagValue,
  sortEventsDesc,
} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {first, groupBy, removeUndefined} from "@welshman/lib"
import {derived} from "svelte/store"
import {deriveEventsForUrl} from "@app/repository"
import {getRoomMembers} from "@app/members"
// Action items (admin review queue)

export const deriveSpaceActionItems = (url: string) =>
  derived(
    deriveEventsForUrl(url, [
      {
        kinds: [REPORT, ROOM_JOIN, ROOM_LEAVE, ROOM_MEMBERS, ROOM_ADD_MEMBER, ROOM_REMOVE_MEMBER],
      },
    ]),
    $events => {
      const getRoomId = (e: TrustedEvent) =>
        getTagValue(e.kind === ROOM_MEMBERS ? "d" : "h", e.tags)
      const reports = $events.filter(e => e.kind === REPORT)
      const pendingJoins: TrustedEvent[] = []

      // Room-level join requests — most recent per pubkey+h
      for (const [h, roomEvents] of groupBy(getRoomId, $events)) {
        if (!h) continue

        const roomJoins: TrustedEvent[] = []
        const roomLeaves: TrustedEvent[] = []
        const roomMembershipEvents: TrustedEvent[] = []

        for (const event of roomEvents) {
          switch (event.kind) {
            case ROOM_JOIN:
              roomJoins.push(event)
              break
            case ROOM_LEAVE:
              roomLeaves.push(event)
              break
            case ROOM_MEMBERS:
            case ROOM_ADD_MEMBER:
            case ROOM_REMOVE_MEMBER:
              roomMembershipEvents.push(event)
              break
          }
        }

        const roomMembers = new Set(getRoomMembers(url, h, roomMembershipEvents))

        pendingJoins.push(
          ...removeUndefined(
            Array.from(groupBy(e => e.pubkey, roomJoins).values()).map(events =>
              first(sortEventsDesc(events)),
            ),
          ).filter(({pubkey, created_at}) => {
            if (roomMembers.has(pubkey)) return false
            if (
              roomMembershipEvents.some(event => {
                if (event.created_at <= created_at) {
                  return false
                }

                if (event.kind === ROOM_MEMBERS) {
                  return true
                }

                return getPubkeyTagValues(event.tags).includes(pubkey)
              })
            ) {
              return false
            }
            if (roomLeaves.some(e => e.pubkey === pubkey && e.created_at > created_at)) return false

            return true
          }),
        )
      }

      return sortEventsDesc([...reports, ...pendingJoins])
    },
  )
