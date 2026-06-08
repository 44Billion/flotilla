<script lang="ts">
  import type {ComponentProps} from "svelte"
  import {derived} from "svelte/store"
  import {POLL_RESPONSE} from "@welshman/util"
  import ContentMinimal from "@app/components/ContentMinimal.svelte"
  import {deriveEvents} from "@app/repository"
  import {getPollResults} from "@app/polls"

  const props: ComponentProps<typeof ContentMinimal> = $props()

  const responses = deriveEvents([{kinds: [POLL_RESPONSE], "#e": [props.event.id]}])

  const results = derived(responses, $responses => getPollResults(props.event, $responses))
</script>

<div class="flex flex-col gap-0">
  <ContentMinimal {...props} />
  <span class="text-xs opacity-50">{$results.voters} voter{$results.voters === 1 ? "" : "s"}</span>
</div>
