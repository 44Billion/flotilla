<script lang="ts">
  import {formatTimestamp, max} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {COMMENT, getTagValue} from "@welshman/util"
  import Link from "@lib/components/Link.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import ProfileName from "@app/components/ProfileName.svelte"
  import {deriveEventsForUrl} from "@app/repository"
  import {makeThreadPath} from "@app/routes"

  type Props = {
    url: string
    event: TrustedEvent
  }

  const {url, event}: Props = $props()

  const filters = [{kinds: [COMMENT], "#E": [event.id]}]
  const replies = deriveEventsForUrl(url, filters)
  const replyCount = $derived($replies.length)
  const lastActive = $derived(max([...$replies, event].map(e => e.created_at)))
  const title = getTagValue("title", event.tags)
</script>

<Link
  href={makeThreadPath(url, event.id)}
  class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-base-content/10 px-3 py-3 transition-colors hover:bg-base-200/50 sm:grid-cols-[1fr_8rem_5rem_8rem] sm:items-center sm:gap-x-4 sm:px-4">
  <div class="col-span-2 min-w-0 sm:col-span-1">
    <p class="ellipsize text-sm font-bold sm:text-base">{title || "Untitled thread"}</p>
    <p class="ellipsize mt-0.5 text-xs opacity-60 sm:hidden">
      by <ProfileName pubkey={event.pubkey} {url} />
    </p>
  </div>
  <div class="hidden items-center gap-2 sm:flex">
    <ProfileCircle pubkey={event.pubkey} {url} size={6} />
    <span class="ellipsize text-sm">
      <ProfileName pubkey={event.pubkey} {url} />
    </span>
  </div>
  <p class="text-right text-xs opacity-75 sm:text-center sm:text-sm">
    <span class="opacity-60 sm:hidden">Replies · </span>
    {replyCount}
  </p>
  <p class="text-right text-xs opacity-75 sm:text-sm">
    <span class="opacity-60 sm:hidden">Last · </span>
    {formatTimestamp(lastActive)}
  </p>
</Link>
