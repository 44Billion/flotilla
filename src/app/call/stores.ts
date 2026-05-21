import {Room as LiveKitRoom} from "livekit-client"
import {derived, writable} from "svelte/store"
import {type Room} from "@app/core/state"

export type VoiceSession = {
  url: string
  h: string
  room: LiveKitRoom
  cameraOn: boolean
  screenShareOn: boolean
}

/** Mic mute state is separate so toggling it does not re-render video tiles. */
export const voiceMicMuted = writable(true)

export type Pubkey = string

export type VoiceParticipant = {pubkey?: Pubkey; identity: string}

export enum VoiceState {
  Joining = "joining",
  Connected = "connected",
  Disconnected = "disconnected",
}

export const currentVoiceSession = writable<VoiceSession | undefined>(undefined)

export const voiceState = writable<VoiceState>(VoiceState.Disconnected)

export const currentVoiceRoom = writable<Room | undefined>(undefined)

export const pubkeyFromLiveKitIdentity = (identity: string): string | undefined =>
  /^[a-f0-9]{64}$/.test(identity.slice(0, 64)) ? identity.slice(0, 64) : undefined

export const participantFromLiveKitIdentity = (identity: string): VoiceParticipant => {
  const pk = pubkeyFromLiveKitIdentity(identity)
  return pk ? {pubkey: pk, identity} : {identity}
}

export const participantKey = (p: VoiceParticipant) => p.pubkey ?? p.identity

export const speakingParticipants = writable<VoiceParticipant[]>([])

export const participantMediaState = writable(
  new Map<string, {muted: boolean; cameraOn: boolean}>(),
)

export const mediaStateByIdentity = derived(
  [participantMediaState, currentVoiceSession, voiceMicMuted],
  ([$media, $session, $micMuted]) =>
    (identity: string) => {
      if ($session?.room.localParticipant.identity === identity) {
        return {muted: $micMuted, cameraOn: $session.cameraOn}
      }
      return $media.get(identity) ?? {muted: true, cameraOn: false}
    },
)

export const isParticipantSpeaking = derived(
  speakingParticipants,
  $participants => (p: VoiceParticipant) =>
    $participants.some(sp => participantKey(sp) === participantKey(p)),
)

export const isLocalSpeaking = derived(
  [currentVoiceSession, speakingParticipants],
  ([$session, $speaking]) => {
    if (!$session?.room) return false
    const local = participantFromLiveKitIdentity($session.room.localParticipant.identity)
    return $speaking.some(sp => participantKey(sp) === participantKey(local))
  },
)
