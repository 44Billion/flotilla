<script lang="ts">
  import Hashtag from "@assets/icons/hashtag.svg?dataurl"
  import Volume from "@assets/icons/volume.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import ImageIcon from "@lib/components/ImageIcon.svelte"
  import {deriveRoom} from "@app/core/state"

  interface Props {
    h: string
    url: string
    size?: number
    fallbackIcon?: string
  }

  const {url, h, size = 5, fallbackIcon = Hashtag}: Props = $props()

  const room = deriveRoom(url, h)
  const isVoiceRoom = $derived($room.livekit)
</script>

{#if isVoiceRoom}
  <div class="flex shrink-0 items-center gap-1.5">
    <Icon size={size + 1} icon={Volume} />
    {#if $room.picture}
      <span class="text-base">/</span>
      <ImageIcon src={$room.picture} {size} alt="" class="rounded-lg" />
    {/if}
  </div>
{:else if $room.picture}
  <ImageIcon src={$room.picture} {size} alt="" class="rounded-lg" />
{:else}
  <Icon icon={fallbackIcon} {size} />
{/if}
