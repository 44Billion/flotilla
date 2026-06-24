<script lang="ts">
  import {formatTimestamp, max} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {COMMENT, getTagValue} from "@welshman/util"
  import {goto} from "$app/navigation"
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
  const path = makeThreadPath(url, event.id)
  const goToThread = () => goto(path)
</script>

<tr class="cursor-pointer hover:bg-base-200/40 text-sm" onclick={goToThread}>
  <td class="px-4 py-2 align-top">
    <Link href={path} class="ellipsize font-semibold">
      {title || "Untitled thread"}
    </Link>
  </td>
  <td class="px-4 py-2 align-middle">
    <div class="flex items-center gap-2">
      <ProfileCircle pubkey={event.pubkey} {url} size={5} />
      <span class="ellipsize">
        <ProfileName pubkey={event.pubkey} {url} />
      </span>
    </div>
  </td>
  <td class="px-4 py-2 align-middle text-right">
    {replyCount}
  </td>
  <td class="whitespace-nowrap px-4 py-2 align-middle text-right">
    {formatTimestamp(lastActive)}
  </td>
</tr>
