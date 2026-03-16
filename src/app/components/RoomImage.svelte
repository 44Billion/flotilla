<script lang="ts">
  import Hashtag from "@assets/icons/hashtag.svg?dataurl"
  import Volume from "@assets/icons/volume.svg?dataurl"
  import VolumeLoud from "@assets/icons/volume-loud.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import ImageIcon from "@lib/components/ImageIcon.svelte"
  import {deriveRoom} from "@app/core/state"
  import {currentVoiceSession} from "@app/voice"

  interface Props {
    h: string
    url: string
    size?: number
    fallbackIcon?: string
  }

  const {url, h, size = 5, fallbackIcon = Hashtag}: Props = $props()

  const room = deriveRoom(url, h)
  const isVoiceRoom = $derived($room.livekit)
  const isVoiceRoomActive = $derived(
    $currentVoiceSession?.url === url && $currentVoiceSession?.h === h,
  )
</script>

{#if isVoiceRoom}
  <div class="flex shrink-0 items-center gap-1.5">
    <Icon
      size={size + 1}
      icon={isVoiceRoomActive ? VolumeLoud : Volume}
      class={isVoiceRoomActive ? "text-primary -translate-x-0.5" : ""} />
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
