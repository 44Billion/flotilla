<script lang="ts">
  import type {ComponentProps} from "svelte"
  import {onMount} from "svelte"
  import {request} from "@welshman/net"
  import {POLL_RESPONSE} from "@welshman/util"
  import PollVotes from "@app/components/PollVotes.svelte"
  import Content from "@app/components/Content.svelte"

  const props: ComponentProps<typeof Content> = $props()

  onMount(() => {
    if (!props.url) {
      return
    }

    request({
      relays: [props.url],
      filters: [{kinds: [POLL_RESPONSE], "#e": [props.event.id]}],
    })
  })
</script>

<div class="flex flex-col gap-3">
  <Content event={props.event} showEntire url={props.url} />

  {#if props.url}
    <PollVotes url={props.url} event={props.event} />
  {/if}
</div>
