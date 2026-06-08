<script module lang="ts">
  const joinPrompted = new Set<string>()
</script>

<script lang="ts">
  import type {Snippet} from "svelte"
  import {page} from "$app/stores"
  import {once} from "@welshman/lib"
  import {pubkey} from "@welshman/app"
  import Page from "@lib/components/Page.svelte"
  import SecondaryNav from "@lib/components/SecondaryNav.svelte"
  import SpaceMenu from "@app/components/SpaceMenu.svelte"
  import SpaceAuthError from "@app/components/SpaceAuthError.svelte"
  import SpaceTrustRelay from "@app/components/SpaceTrustRelay.svelte"
  import SpaceJoin from "@app/components/SpaceJoin.svelte"
  import {pushModal} from "@app/util/modal"
  import {makeSpacePath} from "@app/util/routes"
  import {decodeRelay, userGroupList, relaysPendingTrust, userSpaceUrls} from "@app/core/state"
  import {deriveRelayAuthError} from "@app/core/commands"

  type Props = {
    children?: Snippet
  }

  const {children}: Props = $props()

  const url = decodeRelay($page.params.relay!)

  const authError = deriveRelayAuthError(url)

  const showAuthError = once(() =>
    pushModal(SpaceAuthError, {url, error: $authError}, {noEscape: true}),
  )

  const showPendingTrust = once(() => pushModal(SpaceTrustRelay, {url}, {noEscape: true}))

  // Watch for relay errors and notify the user
  $effect(() => {
    if ($authError) {
      showAuthError()
    } else if ($relaysPendingTrust.includes(url)) {
      showPendingTrust()
    }
  })

  // Direct links skip Discover — prompt to join when relay is not in the user's space list.
  const shouldPromptJoin = $derived.by(() => {
    void $userGroupList

    return (
      Boolean($pubkey) &&
      !$userSpaceUrls.includes(url) &&
      !$authError &&
      !$relaysPendingTrust.includes(url)
    )
  })

  $effect(() => {
    if (!shouldPromptJoin || joinPrompted.has(url)) {
      return
    }

    joinPrompted.add(url)
    pushModal(SpaceJoin, {url})
  })
</script>

{#if $page.url.pathname === makeSpacePath(url)}
  {@render children?.()}
{:else}
  <SecondaryNav>
    <SpaceMenu {url} />
  </SecondaryNav>
  <Page>
    {#key $page.url.pathname}
      {@render children?.()}
    {/key}
  </Page>
{/if}
