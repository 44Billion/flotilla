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

<section class="rounded-box border border-base-content/15 bg-base-100 shadow-sm">
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
  <table class="w-full border-collapse">
    <thead
      class="hidden text-xs font-bold uppercase tracking-wide opacity-60 sm:table-header-group">
      <tr class="border-b border-base-content/10 bg-base-200/40">
        <th class="px-4 py-2 text-left font-bold">Topic</th>
        <th class="w-32 px-4 py-2 text-left font-bold">Author</th>
        <th class="w-20 px-4 py-2 text-center font-bold">Replies</th>
        <th class="w-32 px-4 py-2 text-right font-bold">Last post</th>
      </tr>
    </thead>
    <tbody>
      {#each threads as event (event.id)}
        <ThreadBoardItem {url} {event} />
      {/each}
    </tbody>
  </table>
</section>
