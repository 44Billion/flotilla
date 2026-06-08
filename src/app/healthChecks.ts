import {derived, get} from "svelte/store"
import {not, ifLet, sample} from "@welshman/lib"
import {getRelaysFromList, RelayMode} from "@welshman/util"
import {
  getRelay,
  setWriteRelays,
  setReadRelays,
  setSearchRelays,
  setMessagingRelays,
  userRelayList,
  userSearchRelayList,
  userMessagingRelayList,
} from "@welshman/app"
import {hasNip50} from "@app/relays"
import {DEFAULT_RELAYS, DEFAULT_MESSAGING_RELAYS} from "@app/env"

export type HealthCheckContext = {
  readRelays: string[]
  writeRelays: string[]
  messagingRelays: string[]
  searchRelays: string[]
}

export type HealthCheck = {
  title: string
  description: string
  action: string
  isPending: (context: HealthCheckContext) => boolean
  apply: (context: HealthCheckContext) => unknown
}

export const healthCheckContext = derived(
  [userRelayList, userSearchRelayList, userMessagingRelayList],
  ([$userRelayList, $userSearchRelayList, $userMessagingRelayList]) => {
    return {
      readRelays: getRelaysFromList($userRelayList, RelayMode.Read),
      writeRelays: getRelaysFromList($userRelayList, RelayMode.Write),
      searchRelays: getRelaysFromList($userSearchRelayList),
      messagingRelays: getRelaysFromList($userMessagingRelayList),
    }
  },
)

const healthChecks: HealthCheck[] = [
  {
    title: "Missing Inbox Relays",
    description: "Other people aren't currently able to reliably tag you in public notes.",
    action: "Update",
    isPending: context => context.readRelays.length <= 1,
    apply: () => setReadRelays(DEFAULT_RELAYS),
  },
  {
    title: "Missing Outbox Relays",
    description: "Other people aren't currently able to reliably find your public notes.",
    action: "Update",
    isPending: context => context.writeRelays.length <= 1,
    apply: () => setWriteRelays(DEFAULT_RELAYS),
  },
  {
    title: "Missing DM Relays",
    description: "You aren't currently able to reliably send or receive direct messages.",
    action: "Update",
    isPending: context => context.messagingRelays.length <= 1,
    apply: () => setMessagingRelays(DEFAULT_MESSAGING_RELAYS),
  },
  {
    title: "Too Many Inbox Relays",
    description:
      "You have more inbox relays than is really necessary, which can affect resource usage.",
    action: "Prune Selections",
    isPending: context => context.readRelays.length > 8,
    apply: context => setReadRelays(sample(5, context.readRelays)),
  },
  {
    title: "Too Many Outbox Relays",
    description:
      "You have more outbox relays than is really necessary, which can affect resource usage.",
    action: "Prune Selections",
    isPending: context => context.writeRelays.length > 8,
    apply: context => setWriteRelays(sample(5, context.writeRelays)),
  },
  {
    title: "Too Many DM Relays",
    description:
      "You have more DM relays than is really necessary, which can affect resource usage.",
    action: "Prune Selections",
    isPending: context => context.messagingRelays.length > 8,
    apply: context => setMessagingRelays(sample(5, context.messagingRelays)),
  },
  {
    title: "Invalid Search Relays",
    description: "Some of your search relays don't support search.",
    action: "Remove Invalid",
    isPending: context => context.searchRelays.some(url => not(ifLet(getRelay(url), hasNip50))),
    apply: context =>
      setSearchRelays(context.searchRelays.filter(url => ifLet(getRelay(url), hasNip50))),
  },
]

export const isHealthCheckPending = (healthCheck: HealthCheck) =>
  healthCheck.isPending(get(healthCheckContext))

export const applyHealthCheck = (healthCheck: HealthCheck) =>
  healthCheck.apply(get(healthCheckContext))

export const pendingHealthChecks = derived(healthCheckContext, ctx =>
  healthChecks.filter(hc => hc.isPending(ctx)),
)
