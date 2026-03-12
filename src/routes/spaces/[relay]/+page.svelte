<script lang="ts">
  import {page} from "$app/stores"
  import theme from "tailwindcss/defaultTheme"
  import SecondaryNav from "@lib/components/SecondaryNav.svelte"
  import {decodeRelay} from "@app/core/state"
  import {goToSpace} from "@app/util/routes"
  import PrimaryNavSpaces from "@app/components/PrimaryNavSpaces.svelte"
  import SpaceMenu from "@app/components/SpaceMenu.svelte"

  const url = decodeRelay($page.params.relay!)

  goToSpace(url)
</script>

{#if !window.matchMedia(`(min-width: ${theme.screens.md})`).matches}
  <div class="ml-sai mt-sai mb-sai relative z-nav w-14 flex-shrink-0 bg-base-200 pt-4">
    <PrimaryNavSpaces />
  </div>
  <SecondaryNav class="!w-auto !flex flex-grow">
    <SpaceMenu {url} />
  </SecondaryNav>
{/if}
