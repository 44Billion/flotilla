<script lang="ts">
  import {derived} from "svelte/store"
  import {shuffle, partition, ifLet} from "@welshman/lib"
  import {RelayMode} from "@welshman/util"
  import {
    pubkey,
    derivePubkeyRelays,
    getRelay,
    setWriteRelays,
    setReadRelays,
    setSearchRelays,
    setMessagingRelays,
  } from "@welshman/app"
  import Stars from "@assets/icons/stars.svg?dataurl"
  import CheckCircle from "@assets/icons/check-circle.svg?dataurl"
  import DangerTriangle from "@assets/icons/danger-triangle.svg?dataurl"
  import Stethoscope from "@assets/icons/stethoscope.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import type {ActionItem} from "@app/components/RelaySettingsActionItem.svelte"
  import RelaySettingsActionItem from "@app/components/RelaySettingsActionItem.svelte"
  import {hasNip50, DEFAULT_RELAYS, DEFAULT_MESSAGING_RELAYS, PLATFORM_NAME} from "@app/core/state"

  const readRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Read)
  const writeRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Write)
  const searchRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Search)
  const messagingRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Messaging)

  const actionItems = derived(
    [readRelayUrls, writeRelayUrls, messagingRelayUrls, searchRelayUrls],
    ([$readRelayUrls, $writeRelayUrls, $messagingRelayUrls, $searchRelayUrls]) => {
      const $actionItems: ActionItem[] = []

      if ($readRelayUrls.length <= 1) {
        $actionItems.push({
          title: "Missing Inbox Relays",
          subtitle: "Other people aren't currently able to reliably tag you in public notes.",
          action: "Update",
          apply: () => setReadRelays(DEFAULT_RELAYS),
        })
      }

      if ($writeRelayUrls.length <= 1) {
        $actionItems.push({
          title: "Missing Outbox Relays",
          subtitle: "Other people aren't currently able to reliably find your public notes.",
          action: "Update",
          apply: () => setWriteRelays(DEFAULT_RELAYS),
        })
      }

      if ($messagingRelayUrls.length <= 1) {
        $actionItems.push({
          title: "Missing DM Relays",
          subtitle: "You aren't currently able to reliably send or receive direct messages.",
          action: "Update",
          apply: () => setMessagingRelays(DEFAULT_MESSAGING_RELAYS),
        })
      }

      if ($readRelayUrls.length > 8) {
        $actionItems.push({
          title: "Too Many Inbox Relays",
          subtitle:
            "You have more inbox relays than is really necessary, which can affect resource usage.",
          action: "Prune Selections",
          apply: () => setReadRelays(shuffle($readRelayUrls).slice(0, 5)),
        })
      }

      if ($writeRelayUrls.length > 8) {
        $actionItems.push({
          title: "Too Many Outbox Relays",
          subtitle:
            "You have more outbox relays than is really necessary, which can affect resource usage.",
          action: "Prune Selections",
          apply: () => setWriteRelays(shuffle($writeRelayUrls).slice(0, 5)),
        })
      }

      if ($messagingRelayUrls.length > 8) {
        $actionItems.push({
          title: "Too Many DM Relays",
          subtitle:
            "You have more DM relays than is really necessary, which can affect resource usage.",
          action: "Prune Selections",
          apply: () => setMessagingRelays(shuffle($messagingRelayUrls).slice(0, 5)),
        })
      }

      const [okSearchRelays, badSearchRelays] = partition(
        url => Boolean(ifLet(getRelay(url), hasNip50)),
        $searchRelayUrls,
      )

      if (badSearchRelays.length > 0) {
        $actionItems.push({
          title: "Invalid Search Relays",
          subtitle: `Some of your search relays don't support search.`,
          action: "Remove Invalid",
          apply: () => setSearchRelays(okSearchRelays),
        })
      }

      return $actionItems
    },
  )

  const applyAll = () => {
    for (const actionItem of $actionItems) {
      actionItem.apply()
    }
  }
</script>

<div class="card2 bg-alt flex flex-col gap-4 shadow-md">
  <div class="flex justify-between items-center">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={Stethoscope} />
      Health Check
    </strong>
    <span class="flex items-center gap-2 text-sm">
      <Icon icon={$actionItems.length === 0 ? CheckCircle : DangerTriangle} />
      {$actionItems.length} Issue{$actionItems.length === 1 ? "" : "s"} Detected
    </span>
  </div>
  <p>
    {PLATFORM_NAME} actively checks your connection to the network in the background to discover relays
    that are offline, that you don't have access to, or are otherwise causing trouble.
  </p>
  {#each $actionItems as actionItem}
    <RelaySettingsActionItem {...actionItem} />
  {/each}
  {#if $actionItems.length > 0}
    <Button class="btn btn-primary" onclick={applyAll}>
      <Icon icon={Stars} />
      Apply All Recommendations
    </Button>
  {/if}
</div>
