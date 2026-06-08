<script lang="ts">
  import {readable} from "svelte/store"
  import {fade, fly} from "svelte/transition"
  import {goto} from "$app/navigation"
  import {page} from "$app/stores"
  import cx from "classnames"
  import {displayRelayUrl} from "@welshman/util"
  import Microphone from "@assets/icons/microphone.svg?dataurl"
  import VideocameraOff from "@assets/icons/videocamera-off.svg?dataurl"
  import VideocameraRecord from "@assets/icons/videocamera-record.svg?dataurl"
  import Monitor from "@assets/icons/monitor.svg?dataurl"
  import PhoneRounded from "@assets/icons/phone-rounded.svg?dataurl"
  import PhoneCallingRounded from "@assets/icons/phone-calling-rounded.svg?dataurl"
  import ChatRound from "@assets/icons/chat-round.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import Settings from "@assets/icons/settings.svg?dataurl"
  import {Capacitor} from "@capacitor/core"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import VoiceCallAudioSettingsDialog from "@app/components/VoiceCallAudioSettingsDialog.svelte"
  import VoiceRoomJoinDialog from "@app/components/VoiceRoomJoinDialog.svelte"
  import {decodeRelay} from "@app/relays"
  import {deriveRoom, displayRoom, getRoomType, RoomType} from "@app/groups"
  import type {Room} from "@app/groups"
  import {pushModal} from "@app/modal"
  import {notifications} from "@app/notifications"
  import {makeRoomPath} from "@app/routes"
  import {
    VideoCallLayout,
    isDesktopLayout,
    toggleCamera,
    toggleScreenShare,
    videoCallLayout,
  } from "@app/call/video"
  import {
    VoiceState,
    currentVoiceSession,
    currentVoiceRoom,
    voiceMicMuted,
    voiceState,
  } from "@app/call/stores"
  import {cancelJoinVoiceRoom, leaveVoiceRoom, toggleMute} from "@app/call/voice"

  const {relay, h} = $derived($page.params)
  const url = $derived(relay ? decodeRelay(relay) : undefined)
  const displayedRoomStore = $derived(
    url && h && typeof h === "string" ? deriveRoom(url, h) : readable(undefined),
  )
  const routeDisplayedRoom = $derived($displayedRoomStore)

  const isViewingCurrentVoiceRoom = $derived(
    $currentVoiceRoom !== undefined &&
      url !== undefined &&
      typeof h === "string" &&
      $currentVoiceRoom.url === url &&
      $currentVoiceRoom.h === h,
  )

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

  const goToRoom = () => {
    if (!targetRoom) return
    const path = makeRoomPath(targetRoom.url, targetRoom.h)
    if ($page.url.pathname !== path) {
      void goto(path)
    }
  }

  const openCallSettings = () => {
    pushModal(VoiceCallAudioSettingsDialog)
  }

  const showChatButton = $derived($voiceState === VoiceState.Connected && isViewingCurrentVoiceRoom)

  const isChatPanelActive = $derived(
    showChatButton &&
      (isDesktopLayout.current
        ? $videoCallLayout === VideoCallLayout.Split
        : $videoCallLayout === VideoCallLayout.Chat),
  )

  const onChatToggle = () => {
    if (!showChatButton) return
    if (isDesktopLayout.current) {
      videoCallLayout.update(p =>
        p === VideoCallLayout.Split ? VideoCallLayout.Video : VideoCallLayout.Split,
      )
    } else {
      videoCallLayout.update(p =>
        p === VideoCallLayout.Video ? VideoCallLayout.Chat : VideoCallLayout.Video,
      )
    }
  }

  const chatUnread = $derived(
    targetRoom !== undefined && $notifications.has(makeRoomPath(targetRoom.url, targetRoom.h)),
  )

  const mediaToggleClass = "center tooltip tooltip-top btn btn-sm btn-square btn-ghost"
</script>

{#if targetRoom}
  <div
    in:fly={{y: 60, duration: 350}}
    out:fly={{y: 60, duration: 250}}
    class="flex flex-col gap-2 rounded-box bg-base-100 p-3">
    <div class="flex items-start justify-between gap-2">
      <button
        type="button"
        class="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left outline-none hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        onclick={goToRoom}
        aria-label="Open room {roomName}">
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
      </button>
      {#if showChatButton}
        <Button
          data-tip="Toggle Chat"
          class={cx(
            mediaToggleClass,
            "relative shrink-0 overflow-visible",
            isChatPanelActive && "text-primary",
          )}
          onclick={onChatToggle}>
          <span class="relative inline-flex">
            <Icon icon={ChatRound} size={4} />
            {#if chatUnread}
              <span
                transition:fade={{duration: 150}}
                class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-base-100"
                aria-hidden="true"></span>
            {/if}
          </span>
        </Button>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2">
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
          data-tip={$voiceMicMuted ? "Unmute" : "Mute"}
          class={cx(
            mediaToggleClass,
            "overflow-visible",
            $voiceMicMuted && "text-error ring-1 ring-error/50 ring-offset-0 ring-offset-base-100",
          )}
          onclick={toggleMute}>
          <span class="relative inline-flex items-center justify-center overflow-visible">
            <Icon icon={Microphone} size={4} />
            {#if $voiceMicMuted}
              <span
                class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
                aria-hidden="true">
                <span
                  class="h-[1.3px] w-[150%] max-w-none shrink-0 -rotate-45 rounded-full bg-current"
                ></span>
              </span>
            {/if}
          </span>
        </Button>
        <Button
          data-tip={$currentVoiceSession.cameraOn ? "Turn off camera" : "Turn on camera"}
          class={cx(
            mediaToggleClass,
            "overflow-visible",
            $currentVoiceSession.cameraOn && "text-primary",
            !$currentVoiceSession.cameraOn &&
              "text-error ring-1 ring-error/50 ring-offset-0 ring-offset-base-100",
          )}
          onclick={toggleCamera}>
          <Icon
            icon={$currentVoiceSession.cameraOn ? VideocameraRecord : VideocameraOff}
            size={4} />
        </Button>
        {#if !Capacitor.isNativePlatform()}
          <Button
            data-tip={$currentVoiceSession.screenShareOn ? "Stop sharing" : "Share screen"}
            class={cx(mediaToggleClass, $currentVoiceSession.screenShareOn && "text-primary")}
            onclick={toggleScreenShare}>
            <Icon icon={Monitor} size={4} />
          </Button>
        {/if}
        <Button
          data-tip="Call settings"
          class="center tooltip tooltip-top btn btn-sm btn-square btn-ghost"
          onclick={openCallSettings}>
          <Icon icon={Settings} size={4} />
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
