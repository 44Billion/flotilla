<script lang="ts">
  import cx from "classnames"
  import {readable} from "svelte/store"
  import {
    hash,
    gte,
    now,
    displayList,
    formatTimestampAsTime,
    formatTimestampAsDate,
  } from "@welshman/lib"
  import type {TrustedEvent, EventContent} from "@welshman/util"
  import {MESSAGE, COMMENT, getTag} from "@welshman/util"
  import {
    thunks,
    pubkey,
    mergeThunks,
    deriveProfileDisplay,
    displayProfileByPubkey,
  } from "@welshman/app"
  import {isMobile} from "@lib/html"
  import Pen from "@assets/icons/pen.svg?dataurl"
  import Reply from "@assets/icons/reply-2.svg?dataurl"
  import ReplyAlt from "@assets/icons/reply.svg?dataurl"
  import TapTarget from "@lib/components/TapTarget.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import Button from "@lib/components/Button.svelte"
  import ThunkFailure from "@app/components/ThunkFailure.svelte"
  import ProfileDetail from "@app/components/ProfileDetail.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import ReactionSummary from "@app/components/ReactionSummary.svelte"
  import RoomItemZapButton from "@app/components/RoomItemZapButton.svelte"
  import RoomItemEmojiButton from "@app/components/RoomItemEmojiButton.svelte"
  import RoomItemMenuButton from "@app/components/RoomItemMenuButton.svelte"
  import RoomItemMenuMobile from "@app/components/RoomItemMenuMobile.svelte"
  import RoomItemContent from "@app/components/RoomItemContent.svelte"
  import {colors, ENABLE_ZAPS, deriveEventsForUrl, deriveEvent} from "@app/core/state"
  import {publishDelete, publishReaction, canEnforceNip70} from "@app/core/commands"
  import {getRoomItemPath} from "@app/util/routes"
  import {pushModal} from "@app/util/modal"

  interface Props {
    url: string
    event: TrustedEvent
    replyTo?: (event: TrustedEvent) => void
    showPubkey?: boolean
    canEdit: (event: TrustedEvent) => boolean
    onEdit: (event: TrustedEvent) => void
  }

  const {url, event, replyTo = undefined, showPubkey = false, canEdit, onEdit}: Props = $props()

  const path = getRoomItemPath(url, event)
  const shouldProtect = canEnforceNip70(url)
  const today = formatTimestampAsDate(now())
  const profileDisplay = deriveProfileDisplay(event.pubkey, [url])
  const thunk = mergeThunks($thunks.filter(t => t.event.id === event.id))
  const [_, colorValue] = colors[hash(event.pubkey) % colors.length]

  const qTag = getTag("q", event.tags)
  const isQuoteOnly = Boolean(
    gte(qTag?.length, 2) && event.content.trim().match(/^nostr:n(event|addr)1\w+\s*$/),
  )
  const innerComments = isQuoteOnly
    ? deriveEventsForUrl(url, [{kinds: [COMMENT], "#e": [qTag![1]]}])
    : readable([])
  const innerEvent = isQuoteOnly ? deriveEvent(qTag![1], [url]) : readable(undefined)

  const reply = () => replyTo!(event)
  const edit = canEdit(event) ? () => onEdit(event) : undefined

  const onTap = () => pushModal(RoomItemMenuMobile, {url, event, reply, edit})

  const openProfile = () => pushModal(ProfileDetail, {pubkey: event.pubkey, url})

  const deleteReaction = async (event: TrustedEvent) =>
    publishDelete({relays: [url], event, protect: await shouldProtect})

  const createReaction = async (template: EventContent) =>
    publishReaction({...template, event, relays: [url], protect: await shouldProtect})
</script>

<TapTarget
  data-event={event.id}
  {onTap}
  class={cx(
    "group relative flex w-full cursor-default flex-col px-2 py-0.5 text-left hover:bg-base-100/50",
    {"mt-1.5": showPubkey},
  )}>
  <div class="flex w-full gap-3 overflow-auto">
    {#if showPubkey}
      <Button onclick={openProfile} class="flex items-start pt-1.5 justify-center w-8 shrink-0">
        <ProfileCircle
          pubkey={event.pubkey}
          class="border border-solid border-base-content"
          size={8} />
      </Button>
    {:else}
      <div class="w-8 shrink-0"></div>
    {/if}
    <div class="min-w-0 grow pr-1">
      {#if showPubkey}
        <div class="flex items-center gap-2">
          <Button onclick={openProfile} class="text-sm font-bold" style="color: {colorValue}">
            {$profileDisplay}
          </Button>
          <span class="text-xs opacity-50">
            {#if formatTimestampAsDate(event.created_at) === today}
              Today
            {:else}
              {formatTimestampAsDate(event.created_at)}
            {/if}
            at {formatTimestampAsTime(event.created_at)}
          </span>
        </div>
      {/if}
      <div class:mt-2={showPubkey && event.kind !== MESSAGE}>
        <RoomItemContent {url} event={$innerEvent ?? event} />
        {#if thunk}
          <ThunkFailure showToastOnRetry {thunk} class="mt-1 flex justify-end" />
        {/if}
      </div>
    </div>
  </div>
  <div class="row-2 ml-10 mt-1 pl-1">
    <ReactionSummary
      {url}
      {event}
      {deleteReaction}
      {createReaction}
      reactionClass="tooltip-right"
      innerEvent={$innerEvent} />
    {#if path && $innerComments.length > 0}
      {@const pubkeys = $innerComments.map(e => e.pubkey)}
      {@const isOwn = $pubkey && pubkeys.includes($pubkey)}
      {@const info = displayList(pubkeys.map(pubkey => displayProfileByPubkey(pubkey)))}
      {@const tooltip = `${info} commented`}
      <div data-tip={tooltip} class="tooltip tooltip-right flex">
        <Link
          href={path}
          class={cx("btn btn-xs gap-1 rounded-full", {
            "btn-neutral": !isOwn,
            "btn-primary": isOwn,
          })}>
          <Icon icon={ReplyAlt} />
          <span>{$innerComments.length} comment{$innerComments.length === 1 ? "" : "s"}</span>
        </Link>
      </div>
    {/if}
  </div>
  {#if !isMobile}
    <button
      class="join absolute right-2 top-0.5 border border-solid border-neutral text-xs opacity-0 transition-all pr-2"
      class:group-hover:opacity-100={!isMobile}>
      {#if ENABLE_ZAPS}
        <RoomItemZapButton {url} {event} />
      {/if}
      <RoomItemEmojiButton {url} {event} />
      {#if replyTo}
        <Button class="btn join-item btn-xs" onclick={reply}>
          <Icon icon={Reply} size={4} />
        </Button>
      {/if}
      {#if edit}
        <Button class="btn join-item btn-xs" onclick={edit}>
          <Icon icon={Pen} size={4} />
        </Button>
      {/if}
      <RoomItemMenuButton {url} {event} />
    </button>
  {/if}
</TapTarget>
