<script module lang="ts">
  import {AbortError, TimeoutError} from "$lib/util"
  import {VoiceJoinMembershipError} from "@app/voice"
  import {pushToast} from "@app/util/toast"

  export function handleJoinError(e: unknown) {
    if (e instanceof AbortError) return
    console.error("Failed to join voice room", e)
    let message = "Failed to join voice room"
    if (e instanceof VoiceJoinMembershipError) message = e.message
    else if (e instanceof TimeoutError)
      message = "Connection timed out. Please check your network and try again."
    else if (e instanceof Error && e.message === "No signer available") message = e.message
    pushToast({theme: "error", message})
  }
</script>

<script lang="ts">
  import {fly} from "svelte/transition"
  import {displayRelayUrl} from "@welshman/util"
  import Microphone from "@assets/icons/microphone.svg?dataurl"
  import MicrophoneOff from "@assets/icons/microphone-off.svg?dataurl"
  import PhoneRounded from "@assets/icons/phone-rounded.svg?dataurl"
  import PhoneCallingRounded from "@assets/icons/phone-calling-rounded.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import {displayRoom} from "@app/core/state"
  import {
    currentVoiceSession,
    currentVoiceRoom,
    voiceState,
    leaveVoiceRoom,
    toggleMute,
    rejoinVoiceRoom,
    cancelJoinVoiceRoom,
  } from "@app/voice"

  const roomName = $derived(
    $currentVoiceRoom ? displayRoom($currentVoiceRoom.url, $currentVoiceRoom.h) : "",
  )
  const spaceName = $derived($currentVoiceRoom ? displayRelayUrl($currentVoiceRoom.url) : "")

  const handleRejoin = () => {
    void rejoinVoiceRoom().catch(handleJoinError)
  }
</script>

{#if $currentVoiceRoom}
  <div
    in:fly={{y: 60, duration: 350}}
    out:fly={{y: 60, duration: 250}}
    class="flex flex-col gap-2 rounded-box bg-base-100 p-3">
    <div class="flex flex-col gap-0.5">
      {#if $voiceState === "joining"}
        <span class="text-sm font-semibold text-warning">Joining...</span>
      {:else if $voiceState === "connected"}
        <span class="text-sm font-semibold text-success">Voice Connected</span>
      {:else}
        <span class="text-sm font-semibold text-neutral-content">Disconnected</span>
      {/if}
      <span class="ellipsize text-xs opacity-70">
        {roomName} / {spaceName}
      </span>
    </div>
    <div class="flex items-center gap-1">
      {#if $voiceState === "joining"}
        <span class="loading loading-spinner loading-sm"></span>
        <Button
          data-tip="Cancel"
          class="center tooltip tooltip-top btn btn-sm btn-square btn-ghost"
          onclick={cancelJoinVoiceRoom}>
          <Icon icon={CloseCircle} size={4} />
        </Button>
      {:else if $voiceState === "connected" && $currentVoiceSession}
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
          onclick={handleRejoin}>
          <Icon icon={PhoneCallingRounded} size={4} />
        </Button>
      {/if}
    </div>
  </div>
{/if}
