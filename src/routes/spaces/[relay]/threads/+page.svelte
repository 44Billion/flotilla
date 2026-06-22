<script lang="ts">
  import {onMount} from "svelte"
  import {readable} from "svelte/store"
  import type {Readable} from "svelte/store"
  import {page} from "$app/stores"
  import {sortBy, partition, spec, max, pushToMapKey, groupBy} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {THREAD, getTagValue} from "@welshman/util"
  import NotesMinimalistic from "@assets/icons/notes-minimalistic.svg?dataurl"
  import Add from "@assets/icons/add.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import ThreadBoard from "@app/components/ThreadBoard.svelte"
  import ThreadCreate from "@app/components/ThreadCreate.svelte"
  import {decodeRelay} from "@app/relays"
  import {displayRoom} from "@app/groups"
  import {makeCommentFilter} from "@app/content"
  import {makeFeed} from "@app/feeds"
  import {pushModal} from "@app/modal"

  const url = decodeRelay($page.params.relay!)

  let loading = $state(true)
  let element: HTMLElement | undefined = $state()
  let events: Readable<TrustedEvent[]> = $state(readable([]))

  const createThread = () => pushModal(ThreadCreate, {url})

  const threadFeed = $derived.by(() => {
    const scores = new Map<string, number[]>()
    const [threads, comments] = partition(spec({kind: THREAD}), $events)

    for (const comment of comments) {
      const id = getTagValue("E", comment.tags)

      if (id) {
        pushToMapKey(scores, id, comment.created_at)
      }
    }

    const items = sortBy(e => -max([...(scores.get(e.id) || []), e.created_at]), threads)

    const byRoom = groupBy(e => getTagValue("h", e.tags) || "", items)
    const roomName = (h: string) => (h ? displayRoom(url, h) : "general").toLowerCase()
    const boards = sortBy(([h]) => roomName(h), Array.from(byRoom.entries()))

    return {items, boards}
  })

  onMount(() => {
    const feed = makeFeed({
      url,
      element: element!,
      filters: [{kinds: [THREAD]}, makeCommentFilter([THREAD])],
      onBackwardExhausted: () => {
        loading = false
      },
    })

    events = feed.events

    return () => {
      feed.cleanup()
    }
  })
</script>

<SpaceBar>
  {#snippet leading()}
    <Icon icon={NotesMinimalistic} />
  {/snippet}
  {#snippet title()}
    <strong>Threads</strong>
  {/snippet}
  {#snippet action()}
    <Button class="btn btn-sm btn-primary" onclick={createThread}>
      <Icon icon={Add} />
      Create
    </Button>
  {/snippet}
</SpaceBar>

<PageContent bind:element class="flex flex-col gap-2 p-2 sm:gap-4 sm:p-4">
  {#each threadFeed.boards as [h, threads] (h || "general")}
    <ThreadBoard {url} {h} {threads} />
  {/each}
  <p class="flex h-10 items-center justify-center py-20">
    <Spinner {loading}>
      {#if loading}
        Looking for threads...
      {:else if threadFeed.items.length === 0}
        No threads found.
      {:else}
        That's all!
      {/if}
    </Spinner>
  </p>
</PageContent>
