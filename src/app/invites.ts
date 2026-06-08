import {fromPairs, tryCatch} from "@welshman/lib"
import {isRelayUrl, normalizeRelayUrl} from "@welshman/util"
export type InviteData = {url: string; claim: string}

export const parseInviteLink = (invite: string): InviteData | undefined => {
  if (invite.length < 3 || !invite.includes(".")) {
    return
  }

  return (
    tryCatch(() => {
      const {r: relay = "", c: claim = ""} = fromPairs(Array.from(new URL(invite).searchParams))
      const url = normalizeRelayUrl(relay)

      if (isRelayUrl(url)) {
        return {url, claim}
      }
    }) ||
    tryCatch(() => {
      const url = normalizeRelayUrl(invite)

      if (isRelayUrl(url)) {
        return {url, claim: ""}
      }
    })
  )
}
