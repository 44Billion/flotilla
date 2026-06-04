<script lang="ts">
  import {onMount} from "svelte"
  import {readable} from "svelte/store"
  import type {Readable} from "svelte/store"
  import {page} from "$app/stores"
  import {sortBy, partition, spec, pushToMapKey, max} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {getTagValue, POLL} from "@welshman/util"
  import {fly} from "@lib/transition"
  import PollIcon from "@assets/icons/revote.svg?dataurl"
  import Add from "@assets/icons/add.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import PollItem from "@app/components/PollItem.svelte"
  import PollCreate from "@app/components/PollCreate.svelte"
  import {decodeRelay, makeCommentFilter} from "@app/core/state"
  import {makeFeed} from "@app/core/requests"
  import {pushModal} from "@app/util/modal"

  const url = decodeRelay($page.params.relay!)

  let loading = $state(true)
  let element: HTMLElement | undefined = $state()
  let events: Readable<TrustedEvent[]> = $state(readable([]))

  const createPoll = () => pushModal(PollCreate, {url})

  const items = $derived.by(() => {
    const scores = new Map<string, number[]>()
    const [polls, comments] = partition(spec({kind: POLL}), $events)

    for (const comment of comments) {
      const id = getTagValue("E", comment.tags)

      if (id) {
        pushToMapKey(scores, id, comment.created_at)
      }
    }

    return sortBy(e => -max([...(scores.get(e.id) || []), e.created_at]), polls)
  })

  onMount(() => {
    const feed = makeFeed({
      url,
      element: element!,
      filters: [{kinds: [POLL]}, makeCommentFilter([POLL])],
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
    <Icon icon={PollIcon} />
  {/snippet}
  {#snippet title()}
    <strong>Polls</strong>
  {/snippet}
  {#snippet action()}
    <Button class="btn btn-primary btn-sm" onclick={createPoll}>
      <Icon icon={Add} />
      Create
    </Button>
  {/snippet}
</SpaceBar>

<PageContent bind:element class="flex flex-col gap-2 p-2">
  {#each items as event (event.id)}
    <div in:fly>
      <PollItem {url} event={$state.snapshot(event)} />
    </div>
  {/each}
  <p class="flex h-10 items-center justify-center py-20">
    <Spinner {loading}>
      {#if loading}
        Looking for polls...
      {:else if items.length === 0}
        No polls found.
      {:else}
        That's all!
      {/if}
    </Spinner>
  </p>
</PageContent>
