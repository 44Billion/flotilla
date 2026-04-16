<script lang="ts">
  import {onMount} from "svelte"
  import {page} from "$app/stores"
  import {sleep} from "@welshman/lib"
  import type {MakeNonOptional} from "@welshman/lib"
  import {COMMENT, POLL, POLL_RESPONSE} from "@welshman/util"
  import {repository} from "@welshman/app"
  import {request} from "@welshman/net"
  import {deriveEventsById, deriveEventsAsc} from "@welshman/store"
  import SortVertical from "@assets/icons/sort-vertical.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import NoteCard from "@app/components/NoteCard.svelte"
  import NoteContent from "@app/components/NoteContent.svelte"
  import CommentActions from "@app/components/CommentActions.svelte"
  import EventReply from "@app/components/EventReply.svelte"
  import {deriveEvent, decodeRelay} from "@app/core/state"

  const {relay, id} = $page.params as MakeNonOptional<typeof $page.params>
  const url = decodeRelay(relay)
  const event = deriveEvent(id, [url])
  const filters = [{kinds: [COMMENT], "#E": [id]}]
  const comments = deriveEventsAsc(deriveEventsById({repository, filters}))

  const back = () => history.back()

  const openReply = () => {
    showReply = true
  }

  const closeReply = () => {
    showReply = false
  }

  const expand = () => {
    showAll = true
  }

  let showAll = $state(false)
  let showReply = $state(false)

  onMount(() => {
    const controller = new AbortController()

    request({
      relays: [url],
      filters: [{kinds: [POLL], ids: [id]}, {kinds: [POLL_RESPONSE], "#e": [id]}, ...filters],
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  })
</script>

<SpaceBar {back}>
  {#snippet title()}
    <h1 class="text-xl">{$event?.content || "Poll"}</h1>
  {/snippet}
</SpaceBar>

<PageContent class="flex flex-col gap-3 p-2 pt-4">
  {#if $event}
    <div class="flex flex-col gap-3">
      <NoteCard event={$event} {url} class="card2 bg-alt z-feature w-full">
        <div class="col-3 ml-12 flex flex-col gap-3">
          <NoteContent showEntire event={$event} {url} />
          <CommentActions segment="polls" showActivity {url} event={$event} />
        </div>
      </NoteCard>
      {#if !showAll && $comments.length > 4}
        <div class="flex justify-center">
          <Button class="btn btn-link" onclick={expand}>
            <Icon icon={SortVertical} />
            Show all {$comments.length} comments
          </Button>
        </div>
      {/if}
      {#each $comments.slice(0, showAll ? undefined : 4) as reply (reply.id)}
        <NoteCard event={reply} {url} class="card2 bg-alt z-feature w-full">
          <div class="col-3 ml-12">
            <NoteContent showEntire event={reply} {url} />
            <CommentActions segment="polls" event={reply} {url} />
          </div>
        </NoteCard>
      {/each}
    </div>
    {#if showReply}
      <EventReply {url} event={$event} onClose={closeReply} onSubmit={closeReply} />
    {:else}
      <div class="flex justify-end p-2">
        <Button class="btn btn-primary" onclick={openReply}>Comment on this poll</Button>
      </div>
    {/if}
  {:else}
    {#await sleep(5000)}
      <Spinner loading>Loading poll...</Spinner>
    {:then}
      <p>Failed to load poll.</p>
    {/await}
  {/if}
</PageContent>
