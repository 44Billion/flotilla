<script lang="ts">
  import type {TrustedEvent} from "@welshman/util"
  import RoomName from "@app/components/RoomName.svelte"
  import ThreadBoardItem from "@app/components/ThreadBoardItem.svelte"

  type Props = {
    url: string
    h: string
    threads: TrustedEvent[]
  }

  const {url, h, threads}: Props = $props()
</script>

<section class="overflow-hidden rounded-box border border-base-content/15 bg-base-100 shadow-sm">
  <header
    class="flex items-center justify-between gap-2 border-b border-base-content/15 bg-base-200/70 px-4 py-2.5">
    <h2 class="text-sm font-bold sm:text-base">
      {#if h}
        #<RoomName {url} {h} />
      {:else}
        General
      {/if}
    </h2>
    <span class="text-xs opacity-60">
      {threads.length}
      {threads.length === 1 ? "topic" : "topics"}
    </span>
  </header>
  <div
    class="hidden border-b border-base-content/10 bg-base-200/40 px-4 py-2 text-xs font-bold uppercase tracking-wide opacity-60 sm:grid sm:grid-cols-[1fr_8rem_5rem_8rem] sm:gap-x-4">
    <span>Topic</span>
    <span>Author</span>
    <span class="text-center">Replies</span>
    <span class="text-right">Last post</span>
  </div>
  {#each threads as event (event.id)}
    <ThreadBoardItem {url} {event} />
  {/each}
</section>
