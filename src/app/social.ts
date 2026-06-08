import {derived} from "svelte/store"
import {displayProfileByPubkey, getProfile, userFollowList, userMuteList} from "@welshman/app"
import {shuffle, tryCatch} from "@welshman/lib"
import {
  getAddress,
  getAddressTagValues,
  getEventTagValues,
  getListTags,
  getParentAddrs,
  getParentIds,
  getPubkeyTagValues,
  getTagValues,
} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {withGetter} from "@welshman/store"
import {DEFAULT_PUBKEYS} from "@app/env"
export const bootstrapPubkeys = derived(userFollowList, $userFollowList => {
  const appPubkeys = DEFAULT_PUBKEYS.split(",")
  const userPubkeys = shuffle(getPubkeyTagValues(getListTags($userFollowList)))

  return userPubkeys.length > 5 ? userPubkeys : [...userPubkeys, ...appPubkeys]
})

export const isEventMuted = withGetter(
  derived(userMuteList, $userMuteList => {
    const pubkey = $userMuteList?.event.pubkey
    const tags = getListTags($userMuteList)
    const mutedEvents = new Set(getEventTagValues(tags))
    const mutedPubkeys = new Set(getPubkeyTagValues(tags))
    const mutedAddresses = new Set(getAddressTagValues(tags))
    const mutedTopics = new Set(getTagValues("t", tags))
    const mutedWords = getTagValues("word", tags)
    const regex =
      mutedWords.length > 0
        ? new RegExp(`\\b(${mutedWords.map(w => w.toLowerCase().trim()).join("|")})\\b`)
        : null

    return (e: TrustedEvent) => {
      if (!pubkey) return false
      if (pubkey === e.pubkey) return false
      if (mutedPubkeys.has(e.pubkey)) return true
      if (mutedEvents.has(e.id)) return true
      if (mutedAddresses.has(getAddress(e))) return true
      if (getParentIds(e).some(id => mutedEvents.has(id))) return true
      if (getParentAddrs(e).some(address => mutedAddresses.has(address))) return true
      if (getTagValues("t", e.tags).some(t => mutedTopics.has(t))) return true

      if (regex) {
        if (e.content?.toLowerCase().match(regex)) return true
        if (displayProfileByPubkey(e.pubkey).toLowerCase().match(regex)) return true
        if (tryCatch(() => getProfile(e.pubkey)?.nip05?.match(regex))) return true
      }

      return false
    }
  }),
)
