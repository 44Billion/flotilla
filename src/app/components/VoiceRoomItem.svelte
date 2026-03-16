<script lang="ts">
  import cx from "classnames"
  import {loadProfile, displayProfileByPubkey} from "@welshman/app"
  import SecondaryNavItem from "@lib/components/SecondaryNavItem.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import RoomImage from "@app/components/RoomImage.svelte"
  import RoomName from "@app/components/RoomName.svelte"
  import {pushToast} from "@app/util/toast"
  import {makeRoomPath} from "@app/util/routes"
  import {
    deriveVoiceParticipants,
    joinVoiceRoom,
    cancelJoinVoiceRoom,
    currentVoiceRoom,
    voiceState,
    isParticipantSpeaking,
    participantKey,
    type VoiceParticipant,
  } from "@app/voice"

  interface Props {
    url: string
    h: string
    replaceState?: boolean
  }

  const {url, h, replaceState = false}: Props = $props()

  const participants = deriveVoiceParticipants(url, h)
  const isActive = $derived(
    $voiceState === "connected" && $currentVoiceRoom?.url === url && $currentVoiceRoom?.h === h,
  )
  const isJoining = $derived(
    $voiceState === "joining" && $currentVoiceRoom?.url === url && $currentVoiceRoom?.h === h,
  )

  const handleClick = async () => {
    if (isActive) return

    if (isJoining) {
      cancelJoinVoiceRoom()
      return
    }

    try {
      await joinVoiceRoom(url, h)
    } catch (e) {
      console.error("Failed to join voice room", e)
      pushToast({theme: "error", message: "Failed to join voice room"})
    }
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
  onclick={handleClick}
  class={cx("!items-start", isActive && "!bg-base-100 !text-base-content")}>
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
          <span class="ellipsize text-xs opacity-70">
            {p.pubkey ? displayProfileByPubkey(p.pubkey) : "Unknown"}
          </span>
        </div>
      {/each}
    {/if}
  </div>
</SecondaryNavItem>
