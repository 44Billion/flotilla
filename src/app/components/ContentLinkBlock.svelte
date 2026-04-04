<script lang="ts">
  import {call, ellipsize, displayUrl, postJson} from "@welshman/lib"
  import {isRelayUrl, getTagValue} from "@welshman/util"
  import {Capacitor} from "@capacitor/core"
  import {preventDefault, stopPropagation} from "@lib/html"
  import Link from "@lib/components/Link.svelte"
  import ContentLinkDetail from "@app/components/ContentLinkDetail.svelte"
  import ContentLinkUrl from "@app/components/ContentLinkUrl.svelte"
  import ContentLinkBlockImage from "@app/components/ContentLinkBlockImage.svelte"
  import {pushModal} from "@app/util/modal"
  import {
    dufflepud,
    IMAGE_CONTENT_TYPES,
    PLATFORM_URL,
    VIDEO_CONTENT_TYPES,
    THUMBNAIL_URL,
    isRoomId,
  } from "@app/core/state"

  const {value, event} = $props()

  let hideImage = $state(false)

  const url = value.url.toString()
  const isRoomOrRelay = isRoomId(url) || isRelayUrl(url)
  const [href, external] = call(() => {
    if (url.startsWith(PLATFORM_URL)) return [url.replace(PLATFORM_URL, ""), false]

    return [url, true]
  })

  const fileType = getTagValue("file-type", event.tags) || ""

  const getVideoPoster = (videoUrl: string): string | undefined => {
    if (Capacitor.getPlatform() === "android" && THUMBNAIL_URL) {
      return `${THUMBNAIL_URL}/thumbnail?url=${encodeURIComponent(videoUrl)}`
    }

    return undefined
  }

  const loadPreview = async () => {
    const json = await postJson(dufflepud("link/preview"), {url})

    if (!json?.title && !json?.image) {
      throw new Error("Failed to load link preview")
    }

    return json
  }

  const onError = () => {
    hideImage = true
  }

  const expand = () => pushModal(ContentLinkDetail, {value, event}, {fullscreen: true})
</script>

{#if isRoomOrRelay}
  <div>
    <ContentLinkUrl {url} class="link-content whitespace-nowrap" />
  </div>
{:else}
  <Link {external} {href} class="my-2 block">
    <div class="overflow-hidden rounded-box">
      {#if url.match(/\.(mov|webm|mp4)$/) || VIDEO_CONTENT_TYPES.includes(fileType)}
        <video
          controls
          src={url}
          poster={getVideoPoster(url)}
          preload="metadata"
          class="max-h-96 rounded-box object-contain object-center">
          <track kind="captions" />
        </video>
      {:else if url.match(/\.(jpe?g|png|gif|webp)$/) || IMAGE_CONTENT_TYPES.includes(fileType)}
        <button type="button" onclick={stopPropagation(preventDefault(expand))}>
          <ContentLinkBlockImage {value} {event} class="m-auto max-h-96 rounded-box" />
        </button>
      {:else}
        {#await loadPreview()}
          <div class="center my-12 w-full">
            <span class="loading loading-spinner"></span>
          </div>
        {:then preview}
          <div class="bg-alt flex max-w-xl flex-col leading-normal">
            {#if preview.image && !hideImage}
              <img
                alt=""
                onerror={onError}
                src={preview.image}
                class="bg-alt max-h-72 rounded-t-box object-contain object-center" />
            {/if}
            <div class="flex flex-col gap-2 p-4">
              <strong class="overflow-hidden text-ellipsis whitespace-nowrap"
                >{preview.title || displayUrl(url)}</strong>
              <p>{ellipsize(preview.description, 140)}</p>
            </div>
          </div>
        {:catch}
          <p class="bg-alt p-12 text-center leading-normal">
            Unable to load a preview for {url}
          </p>
        {/await}
      {/if}
    </div>
  </Link>
{/if}
