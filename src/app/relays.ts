import {
  RELAY_INVITE,
  RELAY_JOIN,
  RELAY_LEAVE,
  ManagementMethod,
  getRelaysFromList,
  getTagValue,
  isShareableRelayUrl,
  makeEvent,
  normalizeRelayUrl,
} from "@welshman/util"
import type {List, RelayProfile} from "@welshman/util"
import {AuthStateEvent, AuthStatus, Pool, SocketEvent, SocketStatus, load} from "@welshman/net"
import {derived, readable} from "svelte/store"
import {
  call,
  filterVals,
  fromPairs,
  isDefined,
  last,
  on,
  poll,
  simpleCache,
  uniq,
} from "@welshman/lib"
import {throttled} from "@welshman/store"
import {loadRelay, manageRelay, publishThunk, sign, waitForThunkError} from "@welshman/app"
import {checkRelayHasLivekit} from "$lib/livekit"
import {stripPrefix} from "@lib/util"
import {relaysMostlyRestricted} from "@app/policies"

export const hasNip29 = (relay?: RelayProfile) =>
  Boolean(relay?.supported_nips?.map?.(String)?.includes?.("29"))

export const hasNip50 = (relay?: RelayProfile) =>
  Boolean(relay?.supported_nips?.map?.(String)?.includes?.("50"))

export const encodeRelay = (url: string) =>
  encodeURIComponent(
    normalizeRelayUrl(url)
      .replace(/^wss:\/\//, "")
      .replace(/\/$/, ""),
  )

export const decodeRelay = (url: string) => normalizeRelayUrl(decodeURIComponent(url))

export const deriveSocket = (url: string) => {
  const socket = Pool.get().get(url)

  return readable(socket, set => {
    const subs = [
      on(socket, SocketEvent.Error, () => set(socket)),
      on(socket, SocketEvent.Status, () => set(socket)),
      on(socket.auth, AuthStateEvent.Status, () => set(socket)),
    ]

    return () => subs.forEach(call)
  })
}

export const deriveSocketStatus = (url: string) =>
  throttled(
    800,
    derived([deriveSocket(url), relaysMostlyRestricted], ([$socket, $relaysMostlyRestricted]) => {
      if ($socket.status === SocketStatus.Opening) {
        return {theme: "warning", title: "Connecting"}
      }

      if ($socket.status === SocketStatus.Closing) {
        return {theme: "gray-500", title: "Not Connected"}
      }

      if ($socket.status === SocketStatus.Closed) {
        return {theme: "gray-500", title: "Not Connected"}
      }

      if ($socket.status === SocketStatus.Error) {
        return {theme: "error", title: "Failed to Connect"}
      }

      if ($socket.auth.status === AuthStatus.Requested) {
        return {theme: "warning", title: "Authenticating"}
      }

      if ($socket.auth.status === AuthStatus.PendingSignature) {
        return {theme: "warning", title: "Authenticating"}
      }

      if ($socket.auth.status === AuthStatus.DeniedSignature) {
        return {theme: "error", title: "Failed to Authenticate"}
      }

      if ($socket.auth.status === AuthStatus.PendingResponse) {
        return {theme: "warning", title: "Authenticating"}
      }

      if ($socket.auth.status === AuthStatus.Forbidden) {
        return {theme: "error", title: "Access Denied"}
      }

      if ($relaysMostlyRestricted[url]) {
        return {theme: "error", title: "Access Denied"}
      }

      return {theme: "success", title: "Connected"}
    }),
  )

export const deriveSupportedMethods = simpleCache(([url]: [string]) => {
  return readable<ManagementMethod[]>([], set => {
    manageRelay(url, {
      method: ManagementMethod.SupportedMethods,
      params: [],
    }).then(({result = []}) => set(result))
  })
})

export const deriveHasLivekit = simpleCache(([url]: [string]) =>
  readable<boolean | undefined>(undefined, set => {
    checkRelayHasLivekit(url).then(has => set(has))
  }),
)

export const shouldIgnoreError = (error: string) => {
  const isIgnored = error.startsWith("mute: ")
  const isAborted = error.includes("Signing was aborted")
  const isStrictNip29Relay = error.includes("missing group (`h`) tag")

  return isIgnored || isAborted || isStrictNip29Relay
}

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

export const canEnforceNip70 = async (url: string) => {
  const socket = Pool.get().get(url)

  await socket.auth.attemptAuth(sign)

  return socket.auth.status !== AuthStatus.None
}

export const attemptRelayAccess = async (url: string, claim = "") => {
  const socket = Pool.get().get(url)

  socket.attemptToOpen()

  await poll({
    signal: AbortSignal.timeout(3000),
    condition: () => socket.status === SocketStatus.Open,
  })

  if (socket.status !== SocketStatus.Open) {
    return `Failed to connect`
  }

  await socket.auth.attemptAuth(sign)

  if (![AuthStatus.None, AuthStatus.Ok].includes(socket.auth.status)) {
    if (socket.auth.details) {
      return `Failed to authenticate (${socket.auth.details})`
    } else {
      return `Failed to authenticate (${last(socket.auth.status.split(":"))})`
    }
  }

  const error = await waitForThunkError(publishJoinRequest({url, claim}))

  if (shouldIgnoreError(error)) return

  if (claim) {
    if (error.includes("invite code")) {
      return "join request rejected"
    }
  } else if (error.includes("invite code")) {
    return
  }

  return stripPrefix(error)
}

export const deriveRelayAuthError = (url: string) => {
  Pool.get().get(url).auth.attemptAuth(sign)

  return derived(
    [relaysMostlyRestricted, deriveSocket(url)],
    ([$relaysMostlyRestricted, $socket]) => {
      if ($socket.auth.status === AuthStatus.Forbidden && $socket.auth.details) {
        return stripPrefix($socket.auth.details)
      }

      if ($relaysMostlyRestricted[url]) {
        return stripPrefix($relaysMostlyRestricted[url])
      }
    },
  )
}

export type JoinRequestParams = {
  url: string
  claim: string
}

export const makeJoinRequest = (params: JoinRequestParams) =>
  makeEvent(RELAY_JOIN, {tags: [["claim", params.claim]]})

export const publishJoinRequest = (params: JoinRequestParams) =>
  publishThunk({event: makeJoinRequest(params), relays: [params.url]})

export type LeaveRequestParams = {
  url: string
}

export const publishLeaveRequest = (params: LeaveRequestParams) =>
  publishThunk({event: makeEvent(RELAY_LEAVE), relays: [params.url]})
