<script lang="ts">
  import {displayUrl} from "@welshman/lib"
  import {getTagValue} from "@welshman/util"
  import {preventDefault, stopPropagation} from "@lib/html"
  import LinkRound from "@assets/icons/link-round.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import ContentLinkDetail from "@app/components/ContentLinkDetail.svelte"
  import ContentLinkUrl from "@app/components/ContentLinkUrl.svelte"
  import {pushModal} from "@app/modal"
  import {IMAGE_CONTENT_TYPES} from "@app/core/state"

  const {value, event} = $props()

  const url = value.url.toString()
  const fileType = getTagValue("file-type", event.tags) || ""

  const expand = () => pushModal(ContentLinkDetail, {value, event}, {fullscreen: true})
</script>

{#if url.match(/\.(jpe?g|png|gif|webp)$/) || IMAGE_CONTENT_TYPES.includes(fileType)}
  <!-- Use a real link so people can copy the href -->
  <a
    href={url}
    class="link-content whitespace-nowrap"
    onclick={stopPropagation(preventDefault(expand))}>
    <Icon icon={LinkRound} size={3} class="inline-block" />
    {displayUrl(url)}
  </a>
{:else}
  <ContentLinkUrl {url} class="link-content whitespace-nowrap" />
{/if}
