/**
 * Voice rooms via LiveKit. Note: Voice does not work on localhost in Firefox
 * (ICE candidate gathering fails). Use Chrome or test from deployed HTTPS.
 */
import {
  DisconnectReason,
  LocalParticipant,
  LocalTrackPublication,
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  supportsAudioOutputSelection,
  type AudioCaptureOptions,
} from "livekit-client"
import {derived, get} from "svelte/store"
import {map, removeUndefined, uniqBy} from "@welshman/lib"
import type {TrustedEvent} from "@welshman/util"
import {makeHttpAuth, makeHttpAuthHeader, getTags} from "@welshman/util"
import {signer} from "@welshman/app"
import {getLivekitEndpoint} from "$lib/livekit"
import {AbortError, whenAborted, whenTimeout} from "$lib/util"
import {
  currentVoiceRoom,
  currentVoiceSession,
  participantFromLiveKitIdentity,
  participantKey,
  participantPubkeyMap,
  pubkeyFromLiveKitIdentity,
  speakingParticipants,
  VoiceState,
  type VoiceParticipant,
  voiceState,
} from "@app/call/stores"
import {resetVideoCallLayout, triggerVideoFeedCount, videoPrimaryTileKey} from "@app/call/video"
import {deriveLatestEventForUrl, deriveRoom, makeRoomId} from "@app/core/state"
import {pushToast} from "@app/util/toast"

export const LIVEKIT_PARTICIPANTS = 39004

export {checkRelayHasLivekit} from "$lib/livekit"

export {supportsAudioOutputSelection}

const LIVEKIT_DEFAULT_DEVICE_ID = "default"

export enum DeviceKind {
  AudioInput = "audioinput",
  AudioOutput = "audiooutput",
  VideoInput = "videoinput",
}

export const switchVoiceActiveDevice = async (
  kind: DeviceKind,
  targetDeviceId: string,
): Promise<void> => {
  const session = get(currentVoiceSession)
  if (!session) return
  const id = targetDeviceId === "" ? LIVEKIT_DEFAULT_DEVICE_ID : targetDeviceId
  try {
    await session.room.switchActiveDevice(kind, id)
  } catch {
    let label: string
    switch (kind) {
      case DeviceKind.AudioInput:
        label = "microphone"
        break
      case DeviceKind.AudioOutput:
        label = "speaker"
        break
      case DeviceKind.VideoInput:
        label = "camera"
        break
    }
    pushToast({theme: "error", message: `Error changing ${label}`})
  }
}

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
      const inCall = $participantPubkeyMap.size > 0 && $currentVoiceRoom?.id === makeRoomId(url, h)

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

const setUpMicrophone = async (
  startMuted: boolean,
  preferredMicId: string | undefined,
  participant: LocalParticipant,
): Promise<boolean> => {
  if (startMuted) {
    return true
  }

  let muted = true
  let capture: AudioCaptureOptions | undefined = undefined
  if (preferredMicId) {
    capture = {deviceId: preferredMicId}
  }
  try {
    await participant.setMicrophoneEnabled(true, capture)
    muted = false
  } catch (e) {
    pushToast({theme: "error", message: "Could not access microphone"})
  }
  return muted
}

const onRoomDisconnected = (reason?: DisconnectReason) => {
  videoPrimaryTileKey.set(undefined)
  currentVoiceSession.set(undefined)
  resetVideoCallLayout()
  if (reason !== undefined && reason !== DisconnectReason.CLIENT_INITIATED) {
    voiceState.set(VoiceState.Disconnected)
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
  } else if (track.kind === Track.Kind.Video) {
    triggerVideoFeedCount()
  }
}

const onTrackUnsubscribed = (track: Track) => {
  track.detach().forEach(el => el.remove())
  if (track.kind === Track.Kind.Video) {
    triggerVideoFeedCount()
  }
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

const onLocalTrackUnpublished = (
  publication: LocalTrackPublication,
  participant: LocalParticipant,
) => {
  if (publication.source !== Track.Source.ScreenShare) return
  const session = get(currentVoiceSession)
  if (!session || participant.identity !== session.room.localParticipant.identity) return
  if (!session.screenShareOn) return
  currentVoiceSession.set({...session, screenShareOn: false})
}

let joinAbortController: AbortController | undefined

export const cancelJoinVoiceRoom = () => {
  joinAbortController?.abort()
}

export const joinVoiceRoom = async (
  url: string,
  h: string,
  startMuted = true,
  preferredMicId?: string,
): Promise<void> => {
  cancelJoinVoiceRoom()

  const session = get(currentVoiceSession)
  if (session) await leaveVoiceRoom()

  currentVoiceRoom.set(get(deriveRoom(url, h)))
  voiceState.set(VoiceState.Joining)

  const controller = new AbortController()
  joinAbortController = controller
  const signal = controller.signal
  const isActive = () => joinAbortController === controller

  try {
    const {server_url, participant_token} = await fetchLivekitToken(url, h, signal)

    if (signal.aborted) throw new AbortError()

    const liveKitRoom = new LiveKitRoom({adaptiveStream: true, dynacast: true})

    liveKitRoom.on(RoomEvent.Disconnected, onRoomDisconnected)
    liveKitRoom.on(RoomEvent.ParticipantConnected, onParticipantConnected)
    liveKitRoom.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
    liveKitRoom.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    liveKitRoom.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    liveKitRoom.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
    liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged)

    try {
      await Promise.race([
        liveKitRoom.connect(server_url, participant_token, {maxRetries: 0}),
        whenTimeout(5_000, {
          message: "Connection timed out. Please check your network and try again.",
        }),
        whenAborted(signal),
      ])
    } catch (e) {
      liveKitRoom.disconnect()
      throw e
    }

    participantPubkeyMap.set(new Map())
    addParticipant(liveKitRoom.localParticipant.identity)
    for (const p of liveKitRoom.remoteParticipants.values()) {
      addParticipant(p.identity)
    }

    const muted = await setUpMicrophone(startMuted, preferredMicId, liveKitRoom.localParticipant)

    currentVoiceSession.set({
      url,
      h,
      room: liveKitRoom,
      muted,
      cameraOn: false,
      screenShareOn: false,
    })
    voiceState.set(VoiceState.Connected)
    playJoinSound()
  } catch (e) {
    if (isActive()) voiceState.set(VoiceState.Disconnected)
    if (e instanceof AbortError) return
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

  if (session.cameraOn) {
    try {
      await session.room.localParticipant.setCameraEnabled(false)
    } catch {
      pushToast({theme: "error", message: "Error turning off camera."})
    }
  }

  if (session.screenShareOn) {
    try {
      await session.room.localParticipant.setScreenShareEnabled(false)
    } catch {
      pushToast({theme: "error", message: "Error turning off screen sharing."})
    }
  }

  voiceState.set(VoiceState.Disconnected)
  videoPrimaryTileKey.set(undefined)
  currentVoiceSession.set(undefined)
  resetVideoCallLayout()
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
