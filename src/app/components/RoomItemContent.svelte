<script lang="ts">
  import cx from "classnames"
  import type {ComponentProps} from "svelte"
  import {MESSAGE} from "@welshman/util"
  import {isMobile} from "@lib/html"
  import Link from "@lib/components/Link.svelte"
  import NoteContent from "@app/components/NoteContent.svelte"
  import {getRoomItemPath} from "@app/util/routes"

  const props: ComponentProps<typeof NoteContent> = $props()
  const MESSAGE_MIN_LENGTH = 5000
  const MESSAGE_MAX_LENGTH = 5500

  const path = getRoomItemPath(props.url!, props.event)
  const minLength =
    props.minLength ?? (props.event.kind === MESSAGE ? MESSAGE_MIN_LENGTH : undefined)
  const maxLength =
    props.maxLength ?? (props.event.kind === MESSAGE ? MESSAGE_MAX_LENGTH : undefined)
</script>

<div class={cx("text-sm", {"card2 card2-sm bg-alt": props.event.kind !== MESSAGE})}>
  {#if path && !isMobile}
    <Link href={path}>
      <NoteContent {...props} {minLength} {maxLength} />
    </Link>
  {:else}
    <NoteContent {...props} {minLength} {maxLength} />
  {/if}
</div>
