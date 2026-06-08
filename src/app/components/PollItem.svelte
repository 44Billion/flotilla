<script lang="ts">
  import type {TrustedEvent} from "@welshman/util"
  import {getTagValue} from "@welshman/util"
  import Link from "@lib/components/Link.svelte"
  import NoteContent from "@app/components/NoteContent.svelte"
  import CommentActions from "@app/components/CommentActions.svelte"
  import RoomLink from "@app/components/RoomLink.svelte"
  import ProfileLink from "@app/components/ProfileLink.svelte"
  import {makePollPath} from "@app/routes"

  type Props = {
    url: string
    event: TrustedEvent
  }

  const {url, event}: Props = $props()

  const h = getTagValue("h", event.tags)
</script>

<Link
  class="cv col-2 card2 bg-alt w-full cursor-pointer shadow-md"
  href={makePollPath(url, event.id)}>
  <NoteContent {event} {url} />
  <div class="flex w-full flex-col items-end justify-between gap-2 sm:flex-row">
    <span class="whitespace-nowrap py-1 text-sm opacity-75">
      Posted by <ProfileLink pubkey={event.pubkey} {url} />
      {#if h}
        in <RoomLink {url} {h} />
      {/if}
    </span>
    <CommentActions segment="polls" showActivity {url} {event} />
  </div>
</Link>
