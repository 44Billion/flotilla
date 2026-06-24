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

<tr>
  <td>
    <Link href={makeThreadPath(url, event.id)}>
      <p class="ellipsize text-sm font-bold sm:text-base">{title || "Untitled thread"}</p>
      <p class="ellipsize mt-0.5 text-xs opacity-60 sm:hidden">
        by <ProfileName pubkey={event.pubkey} {url} />
      </p>
    </Link>
  </td>
  <td>
    <ProfileCircle pubkey={event.pubkey} {url} size={6} />
    <span class="ellipsize text-sm">
      <ProfileName pubkey={event.pubkey} {url} />
    </span>
  </td>
  <td>
    <span class="opacity-60 sm:hidden">Replies · </span>
    {replyCount}
  </td>
  <td>
    <span class="opacity-60 sm:hidden">Last · </span>
    {formatTimestamp(lastActive)}
  </td>
</tr>
