<script lang="ts">
  import {onMount} from "svelte"
  import {derived} from "svelte/store"
  import {shuffle, partition, ifLet} from "@welshman/lib"
  import {
    pubkey,
    getRelayLists,
    derivePubkeyRelays,
    addRelay,
    removeRelay,
    addBlockedRelay,
    removeBlockedRelay,
    addMessagingRelay,
    removeMessagingRelay,
    addSearchRelay,
    removeSearchRelay,
    getRelay,
    setWriteRelays,
    setReadRelays,
    setSearchRelays,
    setMessagingRelays,
  } from "@welshman/app"
  import {RelayMode} from "@welshman/util"
  import Plane from "@assets/icons/plane.svg?dataurl"
  import Inbox from "@assets/icons/inbox.svg?dataurl"
  import Server from "@assets/icons/server.svg?dataurl"
  import Mailbox from "@assets/icons/mailbox.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import DangerTriangle from "@assets/icons/danger-triangle.svg?dataurl"
  import ForbiddenCircle from "@assets/icons/forbidden-circle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import RelaySettingsItem from "@app/components/RelaySettingsItem.svelte"
  import type {ActionItem} from "@app/components/RelaySettingsActionItem.svelte"
  import RelaySettingsActionItems from "@app/components/RelaySettingsActionItems.svelte"
  import {pushModal} from "@app/util/modal"
  import {hasNip50, DEFAULT_RELAYS, DEFAULT_MESSAGING_RELAYS} from "@app/core/state"
  import {discoverRelays} from "@app/core/requests"

  const readRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Read)
  const writeRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Write)
  const searchRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Search)
  const blockedRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Blocked)
  const messagingRelayUrls = derivePubkeyRelays($pubkey!, RelayMode.Messaging)

  const addReadRelay = (url: string) => addRelay(url, RelayMode.Read)
  const removeReadRelay = (url: string) => removeRelay(url, RelayMode.Read)
  const addWriteRelay = (url: string) => addRelay(url, RelayMode.Write)
  const removeWriteRelay = (url: string) => removeRelay(url, RelayMode.Write)
  const showActionItems = () => pushModal(RelaySettingsActionItems, {actionItems})

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

  onMount(() => {
    discoverRelays(getRelayLists())
  })
</script>

<div class="content">
  <div class="card2 bg-alt flex flex-col gap-4 shadow-md">
    <div class="flex justify-between">
      <strong class="flex items-center gap-3 text-lg">
        <Icon icon={Server} />
        Your Relays
      </strong>
      {#if $actionItems.length > 0}
        <Button class="btn btn-neutral btn-sm" onclick={showActionItems}>
          <Icon icon={DangerTriangle} />
          {$actionItems.length} Issue{$actionItems.length === 1 ? "" : "s"} Detected
        </Button>
      {/if}
    </div>
    <p class="text-sm mb-2">
      Relays are servers which store your data, or allow you to find data from across the Nostr
      network. We've set you up with some reasonable defaults, but if you're a power user, you can
      customize your relay selections below.
    </p>
    <RelaySettingsItem
      icon={Inbox}
      title="Inbox Relays"
      subtitle="Where you send your public notes. Be sure to select relays that will accept your notes, and which will let people who follow you read them."
      relays={readRelayUrls}
      addRelay={addReadRelay}
      removeRelay={removeReadRelay} />
    <RelaySettingsItem
      icon={Plane}
      title="Outbox Relays"
      subtitle="Where other people should send notes intended for you. Be sure to select relays that will accept notes that tag you."
      relays={writeRelayUrls}
      addRelay={addWriteRelay}
      removeRelay={removeWriteRelay} />
    <RelaySettingsItem
      icon={Mailbox}
      title="DM Relays"
      subtitle="Where you send and receive direct messages. Be sure to select relays that will accept your messages and messages from people you'd like to be in contact with."
      relays={messagingRelayUrls}
      addRelay={addMessagingRelay}
      removeRelay={removeMessagingRelay} />
    <RelaySettingsItem
      icon={Magnifier}
      title="Search Relays"
      subtitle="Relays that support searching for profiles and public notes."
      relays={searchRelayUrls}
      addRelay={addSearchRelay}
      removeRelay={removeSearchRelay}
      matchRelay={url => hasNip50(getRelay(url))} />
    <RelaySettingsItem
      icon={ForbiddenCircle}
      title="Blocked Relays"
      subtitle="These relays won't be used unless explicitly requested."
      relays={blockedRelayUrls}
      addRelay={addBlockedRelay}
      removeRelay={removeBlockedRelay} />
  </div>
</div>
