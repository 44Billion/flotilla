<script lang="ts">
  import {page} from "$app/stores"
  import theme from "tailwindcss/defaultTheme"
  import SecondaryNav from "@lib/components/SecondaryNav.svelte"
  import {decodeRelay} from "@app/core/state"
  import {goToSpace} from "@app/util/routes"
  import PrimaryNavSpaces from "@app/components/PrimaryNavSpaces.svelte"
  import SpaceMenu from "@app/components/SpaceMenu.svelte"

  const url = decodeRelay($page.params.relay!)
  const md = parseInt(theme.screens.md, 10)

  let width = $state(0)

  $effect(() => {
    if (width > md) {
      goToSpace(url)
    }
  })
</script>

<svelte:window bind:innerWidth={width} />

{#if width <= md}
  <div class="ml-sai mt-sai mb-sai relative z-nav w-14 shrink-0 bg-base-200 pt-2">
    <PrimaryNavSpaces />
  </div>
  <SecondaryNav class="flex! w-auto! grow pb-16">
    <SpaceMenu {url} />
  </SecondaryNav>
{/if}
