<script lang="ts">
  import {tweened} from "svelte/motion"
  import type {TrustedEvent} from "@welshman/util"
  import {noop} from "@welshman/lib"
  import {stopPropagation} from "@lib/html"
  import {getPollType, isPollClosed} from "@app/util/polls"

  type Props = {
    event: TrustedEvent
    option: {id: string; label: string}
    results: {voters: number; options: {id: string; votes: number}[]}
    selectedIds: string[]
    setSingleChoice: (id: string) => void
    toggleMultipleChoice: (id: string) => void
  }

  const {event, option, results, selectedIds, setSingleChoice, toggleMultipleChoice}: Props =
    $props()

  const pollType = getPollType(event)
  const closed = isPollClosed(event)

  const selected = $derived(
    pollType === "singlechoice" ? selectedIds[0] === option.id : selectedIds.includes(option.id),
  )
  const onselect = () =>
    pollType === "singlechoice" ? setSingleChoice(option.id) : toggleMultipleChoice(option.id)

  const votes = $derived(results.options.find(r => r.id === option.id)?.votes || 0)
  const maxVotes = $derived(Math.max(...results.options.map(r => r.votes), 1))

  const tweenedVotes = tweened(votes, {duration: 300})
  const tweenedMax = tweened(maxVotes, {duration: 300})

  $effect(() => {
    tweenedVotes.set(votes)
  })

  $effect(() => {
    tweenedMax.set(maxVotes)
  })
</script>

<div class="flex flex-col gap-2 card2 card2-sm bg-alt">
  <div class="flex items-center justify-between gap-2">
    <label class="flex min-w-0 grow items-center gap-2">
      {#if !closed}
        {#if pollType === "singlechoice"}
          <input
            name={event.id}
            type="radio"
            class="radio radio-primary radio-sm"
            checked={selected}
            onclick={stopPropagation(noop)}
            onchange={onselect} />
        {:else}
          <input
            type="checkbox"
            class="checkbox checkbox-primary checkbox-sm"
            checked={selected}
            onclick={stopPropagation(noop)}
            onchange={onselect} />
        {/if}
      {/if}
      <span class="truncate">{option.label}</span>
    </label>
    <span class="whitespace-nowrap text-xs opacity-75">{votes} vote{votes === 1 ? "" : "s"}</span>
  </div>
  <progress class="progress progress-primary" value={$tweenedVotes} max={$tweenedMax}></progress>
</div>
