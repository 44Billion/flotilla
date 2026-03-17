<script lang="ts">
  import type {Snippet} from "svelte"
  import {pubkey} from "@welshman/app"
  import Dialog from "@lib/components/Dialog.svelte"
  import Landing from "@app/components/Landing.svelte"
  import Toast from "@app/components/Toast.svelte"
  import PrimaryNav from "@app/components/PrimaryNav.svelte"
  import {modal} from "@app/util/modal"

  interface Props {
    children: Snippet
  }

  const {children}: Props = $props()
</script>

<div class="flex h-screen overflow-hidden">
  {#if $pubkey}
    <PrimaryNav>
      {@render children?.()}
    </PrimaryNav>
  {:else if !$modal}
    <Dialog noEscape children={{component: Landing, props: {}}} />
  {/if}
</div>
<Toast />
