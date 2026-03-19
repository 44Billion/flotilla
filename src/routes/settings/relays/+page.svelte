<script lang="ts">
  import {onMount} from "svelte"
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
  } from "@welshman/app"
  import {RelayMode} from "@welshman/util"
  import Plane from "@assets/icons/plane.svg?dataurl"
  import Inbox from "@assets/icons/inbox.svg?dataurl"
  import Server from "@assets/icons/server.svg?dataurl"
  import Mailbox from "@assets/icons/mailbox.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import ForbiddenCircle from "@assets/icons/forbidden-circle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import RelaySettingsItem from "@app/components/RelaySettingsItem.svelte"
  import RelaySettingsHealthChecks from "@app/components/RelaySettingsHealthChecks.svelte"
  import {hasNip50} from "@app/core/state"
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

  onMount(() => {
    discoverRelays(getRelayLists())
  })
</script>

<div class="content flex flex-col gap-4">
  <RelaySettingsHealthChecks />
  <div class="card2 bg-alt flex flex-col gap-4 shadow-md">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={Server} />
      Your Relays
    </strong>
    <p class="mb-2">
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
