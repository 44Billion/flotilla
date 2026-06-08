<script lang="ts">
  import type {Readable} from "svelte/store"
  import Check from "@assets/icons/check.svg?dataurl"
  import DangerTriangle from "@assets/icons/danger-triangle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import RelayList from "@app/components/RelayList.svelte"
  import {pushModal} from "@app/modal"

  interface Props {
    icon: string
    title: string
    subtitle: string
    relays: Readable<string[]>
    addRelay: (url: string) => unknown
    removeRelay: (url: string) => unknown
    matchRelay?: (url: string) => boolean
  }

  const {icon, title, relays, subtitle, addRelay, removeRelay, matchRelay}: Props = $props()

  const onclick = () =>
    pushModal(RelayList, {title, subtitle, relays, addRelay, removeRelay, matchRelay})
</script>

<button
  type="button"
  class="btn font-normal flex h-[unset] w-full flex-nowrap py-4 text-left items-start justify-between"
  {onclick}>
  <div class="flex grow flex-row items-start gap-4">
    <div class="flex h-7 w-7 shrink-0 items-center justify-center">
      <Icon {icon} />
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-lg">
        {title}
      </p>
      <p class="text-sm">
        {subtitle}
      </p>
    </div>
  </div>
  <div class="flex items-center justify-end gap-1">
    {#if $relays.length <= 1}
      <Icon icon={DangerTriangle} />
    {:else}
      <Icon icon={Check} />
    {/if}
    {$relays.length}
  </div>
</button>
