<script lang="ts">
  import cx from "classnames"
  import {goto} from "$app/navigation"
  import {loadProfile, displayProfileByPubkey} from "@welshman/app"
  import SecondaryNavItem from "@lib/components/SecondaryNavItem.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import RoomImage from "@app/components/RoomImage.svelte"
  import RoomName from "@app/components/RoomName.svelte"
  import {makeRoomPath} from "@app/util/routes"
  import {pushModal} from "@app/util/modal"
  import VoiceRoomJoinDialog from "@app/components/VoiceRoomJoinDialog.svelte"
  import VoiceParticipantMediaBadges from "@app/components/VoiceParticipantMediaBadges.svelte"
  import {makeRoomId} from "@app/core/state"
  import {
    VoiceState,
    currentVoiceRoom,
    isParticipantSpeaking,
    mediaStateByIdentity,
    participantKey,
    voiceState,
    type VoiceParticipant,
  } from "@app/call/stores"
  import {cancelJoinVoiceRoom, deriveVoiceParticipants} from "@app/call/voice"

  interface Props {
    url: string
    h: string
    replaceState?: boolean
    notification?: boolean
  }

  const {url, h, replaceState = false, notification = false}: Props = $props()

  const participants = deriveVoiceParticipants(url, h)
  const isActive = $derived(
    $voiceState === VoiceState.Connected && $currentVoiceRoom?.id === makeRoomId(url, h),
  )
  const isJoining = $derived(
    $voiceState === VoiceState.Joining && $currentVoiceRoom?.id === makeRoomId(url, h),
  )

  const handleClick = async (e: MouseEvent) => {
    if (isActive) return

    if (isJoining) {
      e.preventDefault()
      cancelJoinVoiceRoom()
      return
    }

    e.preventDefault()
    await goto(makeRoomPath(url, h), {replaceState})
    pushModal(VoiceRoomJoinDialog, {url, h})
  }

  $effect(() => {
    for (const p of $participants) {
      if (p.pubkey) loadProfile(p.pubkey)
    }
  })
</script>

<SecondaryNavItem
  href={makeRoomPath(url, h)}
  {replaceState}
  {notification}
  onclick={handleClick}
  class={cx("items-start!", isActive && "bg-base-100! text-base-content!")}>
  <div class="flex w-full min-w-0 flex-col gap-2">
    <div class="flex gap-2 items-center">
      {#if isJoining}
        <span class="loading loading-spinner loading-sm"></span>
      {:else}
        <RoomImage {url} {h} size={4} />
      {/if}
      <RoomName {url} {h} />
    </div>
    {#if $participants.length > 0}
      {#each $participants as p (participantKey(p as VoiceParticipant))}
        <div class="flex items-center gap-2 ml-6">
          <div
            class={cx(
              "inline-flex shrink-0 items-center justify-center rounded-full transition-shadow",
              isActive && $isParticipantSpeaking(p) && "ring-2 ring-success",
            )}>
            <ProfileCircle pubkey={p.pubkey} size={5} class="h-5 w-5" />
          </div>
          <span class="ellipsize min-w-0 flex-1 text-xs opacity-70">
            {p.pubkey ? displayProfileByPubkey(p.pubkey) : "Unknown"}
          </span>
          {#if isActive}
            {@const media = $mediaStateByIdentity(p.identity)}
            <VoiceParticipantMediaBadges
              muted={media.muted}
              cameraOn={media.cameraOn}
              size={3}
              class="shrink-0" />
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</SecondaryNavItem>
