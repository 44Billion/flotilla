<script lang="ts">
  import {onDestroy} from "svelte"
  import type {TrustedEvent} from "@welshman/util"
  import {pubkey, publishThunk, abortThunk} from "@welshman/app"
  import {PollResponse} from "nostr-tools/kinds"
  import {formatTimestampRelative} from "@welshman/lib"
  import {deriveEvents} from "@app/core/state"
  import {pushToast} from "@app/util/toast"
  import {makePollResponse} from "@app/core/commands"
  import PollOption from "@app/components/PollOption.svelte"
  import {
    getPollEndsAt,
    getPollOptions,
    getPollResponseSelections,
    getPollResults,
    getPollType,
    isPollClosed,
  } from "@app/util/polls"

  type Props = {
    url: string
    event: TrustedEvent
  }

  const {url, event}: Props = $props()

  const responses = deriveEvents([{kinds: [PollResponse], "#e": [event.id]}])

  const pollType = getPollType(event)
  const options = getPollOptions(event)
  const closed = isPollClosed(event)
  const endsAt = getPollEndsAt(event)
  const publishDelay = pollType === "multiplechoice" ? 10_000 : undefined

  const getOwnResponse = (responses: TrustedEvent[]) => {
    let latest: TrustedEvent | undefined

    for (const response of responses) {
      if (response.pubkey !== $pubkey) {
        continue
      }

      if (!latest || response.created_at > latest.created_at) {
        latest = response
      }
    }

    return latest
  }

  const publishSelection = (selection: string[]) => {
    if (activeThunk) {
      abortThunk(activeThunk)
    }

    if (selection.length === 0) {
      activeThunk = undefined
      return
    }

    activeThunk = publishThunk({
      relays: [url],
      event: makePollResponse({event, selectedIds: selection}),
      delay: publishDelay,
    })
  }

  const publishCurrentSelection = () => {
    const selection = pollType === "singlechoice" ? selectedIds.slice(0, 1) : selectedIds

    if (selection.length === 0) {
      return pushToast({theme: "error", message: "Please select at least one option."})
    }

    publishSelection(selection)
  }

  const results = $derived(getPollResults(event, $responses))
  const ownResponse = $derived(getOwnResponse($responses))

  const setSingleChoice = (id: string) => {
    selectedIds = [id]
    publishCurrentSelection()
  }

  const toggleMultipleChoice = (id: string) => {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id]

    publishCurrentSelection()
  }

  let selectedIds = $state<string[]>([])
  let activeThunk: ReturnType<typeof publishThunk> | undefined

  $effect(() => {
    if (ownResponse) {
      selectedIds = getPollResponseSelections(ownResponse, pollType)
    }
  })

  onDestroy(() => {
    if (activeThunk) {
      abortThunk(activeThunk)
    }
  })
</script>

<div class="flex flex-col gap-2">
  {#each options as option (option.id)}
    <PollOption {event} {option} {results} {selectedIds} {setSingleChoice} {toggleMultipleChoice} />
  {/each}
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="text-sm opacity-75">
      {pollType === "multiplechoice" ? "Multiple choice" : "Single choice"}
      {#if endsAt}
        {#if closed}
          • Ended {formatTimestampRelative(endsAt)}
        {:else}
          • Ends {formatTimestampRelative(endsAt)}
        {/if}
      {/if}
    </div>
    <div class="text-sm opacity-75">{results.voters} vote{results.voters === 1 ? "" : "s"}</div>
  </div>
</div>
