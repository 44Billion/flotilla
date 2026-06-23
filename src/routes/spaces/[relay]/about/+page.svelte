<script lang="ts">
  import {page} from "$app/stores"
  import {displayRelayUrl} from "@welshman/util"
  import {deriveRelay} from "@welshman/app"
  import Pen from "@assets/icons/pen.svg?dataurl"
  import ShieldUser from "@assets/icons/shield-user.svg?dataurl"
  import BillList from "@assets/icons/bill-list.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import RelayIcon from "@app/components/RelayIcon.svelte"
  import RelayName from "@app/components/RelayName.svelte"
  import RelayDescription from "@app/components/RelayDescription.svelte"
  import ProfileLink from "@app/components/ProfileLink.svelte"
  import SpaceEdit from "@app/components/SpaceEdit.svelte"
  import SpaceMembersSummary from "@app/components/SpaceMembersSummary.svelte"
  import SpaceFeaturedContent from "@app/components/SpaceFeaturedContent.svelte"
  import {deriveUserIsSpaceAdmin} from "@app/members"
  import {decodeRelay} from "@app/relays"
  import {pushModal} from "@app/modal"

  const url = decodeRelay($page.params.relay!)
  const relay = deriveRelay(url)
  const userIsAdmin = deriveUserIsSpaceAdmin(url)

  const startEdit = () => pushModal(SpaceEdit, {url, initialValues: $relay || {url}})
</script>

<PageContent class="flex flex-col gap-4 p-4">
  <div class="card2 bg-alt flex flex-col gap-4">
    <div class="flex justify-between">
      <div class="relative flex gap-4">
        <div class="relative">
          <RelayIcon {url} size={14} class="rounded-full" />
        </div>
        <div class="flex min-w-0 flex-col">
          <h1 class="ellipsize whitespace-nowrap">
            <RelayName {url} class="text-2xl font-bold" />
          </h1>
          <p class="ellipsize text-sm text-primary">{displayRelayUrl(url)}</p>
        </div>
      </div>
      {#if $userIsAdmin}
        <Button class="btn btn-primary" onclick={startEdit}>
          <Icon icon={Pen} />
          Edit
        </Button>
      {/if}
    </div>
    <RelayDescription {url} />
    {#if $relay?.terms_of_service || $relay?.privacy_policy}
      <div class="flex gap-3">
        {#if $relay.terms_of_service}
          <Link href={$relay.terms_of_service} class="badge badge-neutral flex gap-2">
            <Icon icon={BillList} size={4} />
            Terms of Service
          </Link>
        {/if}
        {#if $relay.privacy_policy}
          <Link href={$relay.privacy_policy} class="badge badge-neutral flex gap-2">
            <Icon icon={ShieldUser} size={4} />
            Privacy Policy
          </Link>
        {/if}
      </div>
    {/if}
    {#if $relay}
      {@const {pubkey, software, version, supported_nips, limitation} = $relay}
      <div class="flex flex-wrap gap-1">
        {#if pubkey}
          <div class="badge badge-neutral text-wrap h-auto">
            <span class="ellipsize">Administrator: <ProfileLink unstyled {pubkey} /></span>
          </div>
        {/if}
        {#if $relay?.contact}
          <div class="badge badge-neutral text-wrap h-auto">
            <span class="ellipsize">Contact: {$relay.contact}</span>
          </div>
        {/if}
        {#if software}
          <div class="badge badge-neutral text-wrap h-auto">
            <span class="ellipsize">Software: {software}</span>
          </div>
        {/if}
        {#if version}
          <div class="badge badge-neutral text-wrap h-auto">
            <span class="ellipsize">Version: {version}</span>
          </div>
        {/if}
        {#if Array.isArray(supported_nips)}
          <p class="badge badge-neutral text-wrap h-auto">
            <span class="ellipsize">Supported NIPs: {supported_nips.join(", ")}</span>
          </p>
        {/if}
        {#if limitation?.auth_required}
          <p class="badge badge-warning">
            <span class="ellipsize">Auth Required</span>
          </p>
        {/if}
        {#if limitation?.payment_required}
          <p class="badge badge-warning">
            <span class="ellipsize">Payment Required</span>
          </p>
        {/if}
        {#if limitation?.min_pow_difficulty}
          <p class="badge badge-warning text-wrap h-auto">
            <span class="ellipsize">Min PoW: {limitation?.min_pow_difficulty}</span>
          </p>
        {/if}
      </div>
    {/if}
  </div>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="lg:col-span-2 flex flex-col gap-4">
      <SpaceFeaturedContent {url} />
    </div>
    <div class="flex flex-col gap-4">
      <SpaceMembersSummary {url} />
    </div>
  </div>
</PageContent>
