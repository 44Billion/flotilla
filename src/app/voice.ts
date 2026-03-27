/**
 * Voice rooms via LiveKit. Note: Voice does not work on localhost in Firefox
 * (ICE candidate gathering fails). Use Chrome or test from deployed HTTPS.
 */
import {DisconnectReason, Room, RoomEvent, Track} from "livekit-client"
import {derived, get, writable} from "svelte/store"
import {map, removeUndefined, uniqBy} from "@welshman/lib"
import type {TrustedEvent} from "@welshman/util"
import {makeHttpAuth, makeHttpAuthHeader, getTags} from "@welshman/util"
import {signer} from "@welshman/app"
import {getLivekitEndpoint} from "$lib/livekit"
import {AbortError, whenAborted, whenTimeout} from "$lib/util"
import {deriveLatestEventForUrl} from "@app/core/state"
import {pushToast} from "@app/util/toast"

export const LIVEKIT_PARTICIPANTS = 39004

export {checkRelayHasLivekit} from "$lib/livekit"

export class VoiceJoinMembershipError extends Error {
  constructor() {
    super("Failed to join voice room: you must be a member.")
    this.name = "VoiceJoinMembershipError"
  }
}

export type VoiceSession = {
  url: string
  h: string
  room: Room
  muted: boolean
}

export type Pubkey = string

export type VoiceParticipant = {pubkey?: Pubkey; identity: string}

export type VoiceState = "joining" | "connected" | "disconnected"

export const currentVoiceSession = writable<VoiceSession | undefined>(undefined)

export const voiceState = writable<VoiceState>("disconnected")

export const currentVoiceRoom = writable<{url: string; h: string} | undefined>(undefined)

export const participantPubkeyMap = writable<Map<string, Pubkey>>(new Map())

const addParticipant = (identity: string) => {
  participantPubkeyMap.update(m => {
    const next = new Map(m)
    next.set(identity, pubkeyFromLiveKitIdentity(identity) ?? "")
    return next
  })
}

const deleteParticipant = (identity: string) => {
  participantPubkeyMap.update(m => {
    const next = new Map(m)
    next.delete(identity)
    return next
  })
}

export const pubkeyFromLiveKitIdentity = (identity: string): string | undefined =>
  /^[a-f0-9]{64}$/.test(identity.slice(0, 64)) ? identity.slice(0, 64) : undefined

export const participantFromLiveKitIdentity = (identity: string): VoiceParticipant => {
  const pk = pubkeyFromLiveKitIdentity(identity)
  return pk ? {pubkey: pk, identity} : {identity}
}

export const participantKey = (p: VoiceParticipant) => p.pubkey ?? p.identity

export const speakingParticipants = writable<VoiceParticipant[]>([])

export const isParticipantSpeaking = derived(
  speakingParticipants,
  $participants => (p: VoiceParticipant) =>
    $participants.some(sp => participantKey(sp) === participantKey(p)),
)

const fetchLivekitToken = async (
  url: string,
  groupId: string,
  signal?: AbortSignal,
): Promise<{server_url: string; participant_token: string}> => {
  const endpoint = getLivekitEndpoint(url, groupId)

  const $signer = signer.get()
  if (!$signer) throw new Error("No signer available")

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

  const template = await makeHttpAuth(endpoint, "GET")
  const signedEvent = await $signer.sign(template)
  const authHeader = makeHttpAuthHeader(signedEvent)

  const response = await fetch(endpoint, {
    headers: {Authorization: authHeader},
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    if (response.status === 403) throw new VoiceJoinMembershipError()
    throw new Error(`Token request failed (${response.status}): ${text}`)
  }

  return response.json()
}

export const deriveVoiceParticipants = (url: string, h: string) =>
  // We use the livekit identity list while in a call, and fall back to the list in kind 39004.
  derived(
    [
      participantPubkeyMap,
      currentVoiceRoom,
      deriveLatestEventForUrl(url, [{kinds: [LIVEKIT_PARTICIPANTS], "#d": [h]}]),
    ],
    ([$participantPubkeyMap, $currentVoiceRoom, $publishedParticipantList]) => {
      const inCall =
        $participantPubkeyMap.size > 0 &&
        $currentVoiceRoom?.url === url &&
        $currentVoiceRoom?.h === h

      if (inCall) {
        const participants = [...$participantPubkeyMap.keys()].map(participantFromLiveKitIdentity)
        return uniqBy((p: VoiceParticipant) => participantKey(p), participants)
      } else {
        const latestEvent = $publishedParticipantList as TrustedEvent | undefined
        if (!latestEvent) return []
        const participants = removeUndefined(
          map(
            (tag: string[]) => (tag[1] ? {pubkey: tag[1], identity: tag[1]} : undefined),
            getTags("participant", latestEvent.tags),
          ),
        )
        return uniqBy((p: VoiceParticipant) => participantKey(p), participants)
      }
    },
  )

const onRoomDisconnected = (reason?: DisconnectReason) => {
  currentVoiceSession.set(undefined)
  if (reason !== undefined && reason !== DisconnectReason.CLIENT_INITIATED) {
    voiceState.set("disconnected")
    const message =
      reason === DisconnectReason.JOIN_FAILURE
        ? "Could not connect to voice room. Please try again."
        : "Voice connection lost."
    pushToast({theme: "error", message})
  }
  speakingParticipants.set([])
  participantPubkeyMap.set(new Map())
}

const onTrackSubscribed = (track: Track) => {
  if (track.kind === Track.Kind.Audio) {
    const element = track.attach()
    element.style.display = "none"
    document.body.appendChild(element)
    element.play().catch(() => {})
  }
}

const onTrackUnsubscribed = (track: Track) => {
  track.detach().forEach(el => el.remove())
}

const onActiveSpeakersChanged = (participants: {identity: string}[]) => {
  speakingParticipants.set(participants.map(p => participantFromLiveKitIdentity(p.identity)))
}

const playJoinSound = () => {
  const audio = new Audio("/join-voice-room.mp3")
  audio.play().catch(() => {})
}

const onParticipantConnected = (participant: {identity: string}) => {
  addParticipant(participant.identity)
  playJoinSound()
}

const onParticipantDisconnected = (participant: {identity: string}) => {
  deleteParticipant(participant.identity)
}

let joinAbortController: AbortController | undefined

export const cancelJoinVoiceRoom = () => {
  joinAbortController?.abort()
}

export const joinVoiceRoom = async (url: string, h: string): Promise<void> => {
  cancelJoinVoiceRoom()

  const session = get(currentVoiceSession)
  if (session) await leaveVoiceRoom()

  currentVoiceRoom.set({url, h})
  voiceState.set("joining")

  const controller = new AbortController()
  joinAbortController = controller
  const signal = controller.signal
  const isActive = () => joinAbortController === controller

  try {
    const {server_url, participant_token} = await fetchLivekitToken(url, h, signal)

    if (signal.aborted) throw new AbortError()

    const room = new Room({adaptiveStream: true, dynacast: true})

    room.on(RoomEvent.Disconnected, onRoomDisconnected)
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged)

    try {
      await Promise.race([
        room.connect(server_url, participant_token, {maxRetries: 0}),
        whenTimeout(5_000, {
          message: "Connection timed out. Please check your network and try again.",
        }),
        whenAborted(signal),
      ])
    } catch (e) {
      room.disconnect()
      throw e
    }

    participantPubkeyMap.set(new Map())
    addParticipant(room.localParticipant.identity)
    for (const p of room.remoteParticipants.values()) {
      addParticipant(p.identity)
    }

    let muted = false
    try {
      await room.localParticipant.setMicrophoneEnabled(true)
    } catch (e) {
      muted = true
      pushToast({theme: "error", message: "Could not access microphone"})
    }

    currentVoiceSession.set({url, h, room, muted})
    voiceState.set("connected")
    playJoinSound()
  } catch (e) {
    if (isActive()) voiceState.set("disconnected")
    throw e
  } finally {
    if (isActive()) joinAbortController = undefined
  }
}

export const leaveVoiceRoom = async () => {
  const session = get(currentVoiceSession)
  if (!session) return

  const audio = new Audio("/leave-voice-room.mp3")
  audio.play().catch(() => {})

  voiceState.set("disconnected")
  currentVoiceSession.set(undefined)
  session.room.disconnect()
  speakingParticipants.set([])
  participantPubkeyMap.set(new Map())
}

export const rejoinVoiceRoom = async (): Promise<void> => {
  const target = get(currentVoiceRoom)
  if (!target) return
  return joinVoiceRoom(target.url, target.h)
}

export const toggleMute = async () => {
  const session = get(currentVoiceSession)
  if (!session) return

  const muted = !session.muted
  if (muted) {
    // Disable and re-enable microphone to trigger permission prompt
    session.room.localParticipant.setMicrophoneEnabled(false)
    currentVoiceSession.set({...session, muted})
    return
  }

  try {
    await session.room.localParticipant.setMicrophoneEnabled(true)
    currentVoiceSession.set({...session, muted})
  } catch (e) {
    pushToast({theme: "error", message: "Could not access microphone"})
  }
}
