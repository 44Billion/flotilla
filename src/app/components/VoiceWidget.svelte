<script lang="ts">
  import {readable} from "svelte/store"
  import {fly} from "svelte/transition"
  import {goto} from "$app/navigation"
  import {page} from "$app/stores"
  import {displayRelayUrl} from "@welshman/util"
  import Microphone from "@assets/icons/microphone.svg?dataurl"
  import MicrophoneOff from "@assets/icons/microphone-off.svg?dataurl"
  import PhoneRounded from "@assets/icons/phone-rounded.svg?dataurl"
  import PhoneCallingRounded from "@assets/icons/phone-calling-rounded.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import VoiceRoomJoinDialog from "@app/components/VoiceRoomJoinDialog.svelte"
  import {
    decodeRelay,
    deriveRoom,
    displayRoom,
    getRoomType,
    RoomType,
    type Room,
  } from "@app/core/state"
  import {pushModal} from "@app/util/modal"
  import {makeRoomPath} from "@app/util/routes"
  import {
    VoiceState,
    currentVoiceSession,
    currentVoiceRoom,
    voiceState,
    leaveVoiceRoom,
    toggleMute,
    cancelJoinVoiceRoom,
  } from "@app/voice"

  const {relay, h} = $derived($page.params)
  const url = $derived(relay ? decodeRelay(relay) : undefined)
  const displayedRoomStore = $derived(
    url && h && typeof h === "string" ? deriveRoom(url, h) : readable(undefined),
  )
  const routeDisplayedRoom = $derived($displayedRoomStore)

  const targetRoom = $derived.by((): Room | undefined => {
    if ($voiceState === VoiceState.Joining || $voiceState === VoiceState.Connected) {
      return $currentVoiceRoom
    }
    if ($voiceState === VoiceState.Disconnected) {
      if (routeDisplayedRoom) {
        if (getRoomType(routeDisplayedRoom) === RoomType.Voice) {
          return routeDisplayedRoom
        }
        return undefined
      }
      return $currentVoiceRoom
    }
    return $currentVoiceRoom
  })

  const roomName = $derived(targetRoom ? displayRoom(targetRoom.url, targetRoom.h) : "")
  const spaceName = $derived(targetRoom ? displayRelayUrl(targetRoom.url) : "")

  const openJoinDialog = async () => {
    if (!targetRoom) return
    await goto(makeRoomPath(targetRoom.url, targetRoom.h))
    pushModal(VoiceRoomJoinDialog, {url: targetRoom.url, h: targetRoom.h})
  }
</script>

{#if targetRoom}
  <div
    in:fly={{y: 60, duration: 350}}
    out:fly={{y: 60, duration: 250}}
    class="flex flex-col gap-2 rounded-box bg-base-100 p-3">
    <div class="flex flex-col gap-0.5">
      {#if $voiceState === VoiceState.Joining}
        <span class="text-sm font-semibold text-warning">Joining...</span>
      {:else if $voiceState === VoiceState.Connected}
        <span class="text-sm font-semibold text-success">Voice Connected</span>
      {:else}
        <span class="text-sm font-semibold text-neutral-content">Disconnected</span>
      {/if}
      <span class="ellipsize text-xs opacity-70">
        {roomName} / {spaceName}
      </span>
    </div>
    <div class="flex items-center gap-1">
      {#if $voiceState === VoiceState.Joining}
        <span class="loading loading-spinner loading-sm"></span>
        <Button
          data-tip="Cancel"
          class="center tooltip tooltip-top btn btn-sm btn-square btn-ghost"
          onclick={cancelJoinVoiceRoom}>
          <Icon icon={CloseCircle} size={4} />
        </Button>
      {:else if $voiceState === VoiceState.Connected && $currentVoiceSession}
        <Button
          data-tip={$currentVoiceSession.muted ? "Unmute" : "Mute"}
          class="center tooltip tooltip-top btn btn-sm btn-square {$currentVoiceSession.muted
            ? 'btn-error'
            : 'btn-ghost'}"
          onclick={toggleMute}>
          <Icon icon={$currentVoiceSession.muted ? MicrophoneOff : Microphone} size={4} />
        </Button>
        <Button
          data-tip="Leave room"
          class="center tooltip tooltip-top btn btn-sm btn-square btn-error"
          onclick={leaveVoiceRoom}>
          <Icon icon={PhoneRounded} size={4} />
        </Button>
      {:else}
        <Button
          data-tip="Join Voice"
          class="center tooltip tooltip-top btn btn-sm btn-square btn-success"
          onclick={openJoinDialog}>
          <Icon icon={PhoneCallingRounded} size={4} />
        </Button>
      {/if}
    </div>
  </div>
{/if}
