<script lang="ts">
  import {formatTimestamp} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {COMMENT} from "@welshman/util"
  import {deriveHandleForPubkey, deriveProfileDisplay, displayHandle} from "@welshman/app"
  import Reply from "@assets/icons/reply-2.svg?dataurl"
  import LinkRound from "@assets/icons/link-round.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import ProfileDetail from "@app/components/ProfileDetail.svelte"
  import NoteContent from "@app/components/NoteContent.svelte"
  import Content from "@app/components/Content.svelte"
  import CommentActions from "@app/components/CommentActions.svelte"
  import ThreadActions from "@app/components/ThreadActions.svelte"
  import {makeEventPermalink} from "@app/routes"
  import {pushModal} from "@app/modal"
  import {clip} from "@app/toast"

  type Props = {
    url: string
    event: TrustedEvent
    threadPubkey: string
    onReply: (event: TrustedEvent) => void
  }

  const {url, event, threadPubkey, onReply}: Props = $props()

  const profileDisplay = deriveProfileDisplay(event.pubkey, [url])
  const handle = deriveHandleForPubkey(event.pubkey)
  const isOp = event.pubkey === threadPubkey
  const isComment = event.kind === COMMENT

  const openProfile = () => pushModal(ProfileDetail, {pubkey: event.pubkey, url})

  const copyPermalink = () => clip(makeEventPermalink(event, url))

  const reply = () => onReply(event)
</script>

<article
  id="post-{event.id}"
  data-event={event.id}
  class="border-b border-base-content/15 bg-base-100">
  <div class="flex flex-col md:flex-row">
    <aside
      class="flex shrink-0 flex-row items-center gap-3 border-b border-base-content/10 bg-base-200/50 p-3 md:w-40 md:flex-col md:items-center md:border-b-0 md:border-r md:p-4 md:text-center">
      <Button onclick={openProfile}>
        <ProfileCircle pubkey={event.pubkey} {url} size={10} class="md:size-14" />
      </Button>
      <div class="flex min-w-0 flex-col gap-1 md:items-center">
        <Button onclick={openProfile} class="text-bold ellipsize text-sm">
          {$profileDisplay}
        </Button>
        {#if $handle}
          <span class="ellipsize text-xs opacity-75">{displayHandle($handle)}</span>
        {/if}
        {#if isOp}
          <span class="badge badge-primary badge-sm">OP</span>
        {/if}
      </div>
    </aside>
    <div class="flex min-w-0 grow flex-col">
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-base-content/10 bg-base-200/40 px-3 py-2 text-xs sm:px-4 sm:text-sm">
        <span class="opacity-75">{formatTimestamp(event.created_at)}</span>
        <Button class="btn btn-ghost btn-xs h-auto min-h-0 gap-1 px-1 py-0" onclick={copyPermalink}>
          <Icon icon={LinkRound} size={3} />
          Permalink
        </Button>
      </div>
      <div class="px-3 py-4 sm:px-4">
        {#if isComment}
          <Content showEntire {event} {url} />
        {:else}
          <NoteContent showEntire {event} {url} />
        {/if}
      </div>
      <div
        class="flex shrink-0 flex-col gap-2 border-t border-base-content/10 bg-base-200/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <Button class="btn btn-neutral btn-xs w-fit gap-1" onclick={reply}>
          <Icon icon={Reply} size={4} />
          Reply
        </Button>
        {#if isComment}
          <CommentActions segment="threads" {event} {url} />
        {:else}
          <ThreadActions {event} {url} />
        {/if}
      </div>
    </div>
  </div>
</article>
