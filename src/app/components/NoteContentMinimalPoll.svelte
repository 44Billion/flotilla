<script lang="ts">
  import type {ComponentProps} from "svelte"
  import {derived} from "svelte/store"
  import {PollResponse} from "nostr-tools/kinds"
  import ContentMinimal from "@app/components/ContentMinimal.svelte"
  import {deriveEvents} from "@app/core/state"
  import {getPollResults} from "@app/util/polls"

  const props: ComponentProps<typeof ContentMinimal> = $props()

  const responses = deriveEvents([{kinds: [PollResponse], "#e": [props.event.id]}])

  const results = derived(responses, $responses => getPollResults(props.event, $responses))
</script>

<div class="flex flex-col gap-0">
  <ContentMinimal {...props} />
  <span class="text-xs opacity-50">{$results.voters} voter{$results.voters === 1 ? "" : "s"}</span>
</div>
