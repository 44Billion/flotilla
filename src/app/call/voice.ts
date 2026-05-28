/**
 * Voice rooms via LiveKit. Note: Voice does not work on localhost in Firefox
 * (ICE candidate gathering fails). Use Chrome or test from deployed HTTPS.
 */
import {
  DisconnectReason,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  TrackPublication,
  supportsAudioOutputSelection,
  type AudioCaptureOptions,
} from "livekit-client"
import {derived, get} from "svelte/store"
import {map, not, nthEq, reject, removeUndefined, uniqBy} from "@welshman/lib"
import type {TrustedEvent} from "@welshman/util"
import {makeHttpAuth, makeHttpAuthHeader, getTags} from "@welshman/util"
import {signer} from "@welshman/app"
import {getLivekitEndpoint} from "$lib/livekit"
import {AbortError, TimeoutError, whenAborted, whenTimeout} from "$lib/util"
import {
  currentVoiceRoom,
  currentVoiceSession,
  voiceMicMuted,
  participantFromLiveKitIdentity,
  participantKey,
  participantMediaState,
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

const deleteParticipant = (identity: string) => {
  participantMediaState.update(m => new Map(reject(nthEq(0, identity), [...m])))
}

const syncParticipantMedia = (participant: Participant) => {
  const state = {muted: !participant.isMicrophoneEnabled, cameraOn: participant.isCameraEnabled}
  participantMediaState.update(m => {
    const prev = m.get(participant.identity)
    if (prev?.muted === state.muted && prev?.cameraOn === state.cameraOn) return m
    const next = new Map(m)
    next.set(participant.identity, state)
    return next
  })
}

const onParticipantMediaChanged = (_publication: TrackPublication, participant: Participant) => {
  syncParticipantMedia(participant)
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
      participantMediaState,
      currentVoiceRoom,
      deriveLatestEventForUrl(url, [{kinds: [LIVEKIT_PARTICIPANTS], "#d": [h]}]),
    ],
    ([$participantMediaState, $currentVoiceRoom, $publishedParticipantList]) => {
      const inCall = $participantMediaState.size > 0 && $currentVoiceRoom?.id === makeRoomId(url, h)

      if (inCall) {
        const participants = [...$participantMediaState.keys()].map(participantFromLiveKitIdentity)
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
  signal?: AbortSignal,
  settleSignal?: AbortSignal,
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
    await Promise.race([
      participant.setMicrophoneEnabled(true, capture),
      whenTimeout(15_000, {message: "Microphone access timed out.", signal: settleSignal}),
      whenAborted(signal),
    ])
    muted = false
  } catch (e) {
    // Timeout or microphone rejection: join muted, the call is still usable. A
    // genuine abort is surfaced to the caller so it can tear down the room.
    if (e instanceof AbortError) throw e
    if (!(e instanceof TimeoutError)) {
      pushToast({theme: "error", message: "Could not access microphone"})
    }
  }
  return muted
}

// The room whose events are allowed to mutate shared state. Abandoned rooms
// (after switching calls or an engine reconnect give-up) must not clobber it.
let activeRoom: LiveKitRoom | undefined

const makeOnRoomDisconnected = (room: LiveKitRoom) => (reason?: DisconnectReason) => {
  // Ignore disconnects from rooms that are no longer the active session.
  if (room !== activeRoom) return

  activeRoom = undefined
  room.removeAllListeners()

  videoPrimaryTileKey.set(undefined)
  voiceMicMuted.set(true)
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
  participantMediaState.set(new Map())
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

const onParticipantConnected = (participant: Participant) => {
  syncParticipantMedia(participant)
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

  currentVoiceRoom.set(get(deriveRoom(url, h)))
  voiceState.set(VoiceState.Joining)

  const controller = new AbortController()
  joinAbortController = controller
  const signal = controller.signal
  const isActive = () => joinAbortController === controller

  // Self-cleaning controller: aborted in finally so whenTimeout/whenAborted
  // helpers clear their timers/listeners once the races below have settled.
  const settle = new AbortController()

  try {
    // Tear down any existing session before joining. Bound it so a slow leave
    // (camera/screenshare renegotiation can take ~15s) cannot block this join.
    if (get(currentVoiceSession)) {
      await Promise.race([
        leaveVoiceRoom(),
        whenTimeout(15_000, {message: "Leaving previous call timed out.", signal: settle.signal}),
        whenAborted(signal),
      ]).catch(e => {
        if (e instanceof AbortError) throw e
      })

      // leaveVoiceRoom flips voiceState to Disconnected; re-assert Joining.
      voiceState.set(VoiceState.Joining)
    }

    if (signal.aborted) throw new AbortError()

    const {server_url, participant_token} = await Promise.race([
      fetchLivekitToken(url, h, signal),
      whenTimeout(15_000, {
        message: "Connection timed out. Please check your network and try again.",
        signal: settle.signal,
      }),
      whenAborted(signal),
    ])

    if (signal.aborted) throw new AbortError()

    const liveKitRoom = new LiveKitRoom({adaptiveStream: true, dynacast: true})
    activeRoom = liveKitRoom

    liveKitRoom.on(RoomEvent.Disconnected, makeOnRoomDisconnected(liveKitRoom))
    liveKitRoom.on(RoomEvent.ParticipantConnected, onParticipantConnected)
    liveKitRoom.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
    liveKitRoom.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    liveKitRoom.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    liveKitRoom.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
    liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged)
    liveKitRoom.on(RoomEvent.TrackMuted, onParticipantMediaChanged)
    liveKitRoom.on(RoomEvent.TrackUnmuted, onParticipantMediaChanged)
    liveKitRoom.on(RoomEvent.TrackPublished, onParticipantMediaChanged)
    liveKitRoom.on(RoomEvent.TrackUnpublished, onParticipantMediaChanged)
    liveKitRoom.on(RoomEvent.LocalTrackPublished, onParticipantMediaChanged)

    try {
      await Promise.race([
        liveKitRoom.connect(server_url, participant_token, {maxRetries: 0}),
        whenTimeout(15_000, {
          message: "Connection timed out. Please check your network and try again.",
          signal: settle.signal,
        }),
        whenAborted(signal),
      ])
    } catch (e) {
      if (activeRoom === liveKitRoom) activeRoom = undefined
      liveKitRoom.removeAllListeners()
      liveKitRoom.disconnect()
      throw e
    }

    participantMediaState.set(new Map())
    syncParticipantMedia(liveKitRoom.localParticipant)
    for (const p of liveKitRoom.remoteParticipants.values()) {
      syncParticipantMedia(p)
    }

    // Bounded against timeout/abort inside setUpMicrophone: a stuck permission
    // prompt resolves to muted rather than hanging the join forever.
    const muted = await setUpMicrophone(
      startMuted,
      preferredMicId,
      liveKitRoom.localParticipant,
      signal,
      settle.signal,
    )

    // A cancel during the mic step must tear down the connected room rather
    // than leaking it.
    if (signal.aborted) {
      if (activeRoom === liveKitRoom) activeRoom = undefined
      liveKitRoom.removeAllListeners()
      liveKitRoom.disconnect()
      throw new AbortError()
    }

    voiceMicMuted.set(muted)
    currentVoiceSession.set({
      url,
      h,
      room: liveKitRoom,
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
    settle.abort()
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

  // Always tear down this room's connection and listeners.
  if (activeRoom === session.room) activeRoom = undefined
  session.room.removeAllListeners()
  session.room.disconnect()

  // Only reset shared UI state if this session is still current. A slow leave
  // that was superseded by a new join (bounded by a timeout in joinVoiceRoom)
  // must not clobber the freshly-joined session when it finally completes.
  if (get(currentVoiceSession) === session) {
    voiceState.set(VoiceState.Disconnected)
    videoPrimaryTileKey.set(undefined)
    voiceMicMuted.set(true)
    currentVoiceSession.set(undefined)
    resetVideoCallLayout()
    speakingParticipants.set([])
    participantMediaState.set(new Map())
  }
}

export const rejoinVoiceRoom = async (): Promise<void> => {
  const target = get(currentVoiceRoom)
  if (!target) return
  return joinVoiceRoom(target.url, target.h)
}

export const toggleMute = async () => {
  const session = get(currentVoiceSession)
  if (!session) return

  voiceMicMuted.update(not)
  if (get(voiceMicMuted)) {
    // Disable and re-enable microphone to trigger permission prompt
    session.room.localParticipant.setMicrophoneEnabled(false)
    return
  }

  try {
    await session.room.localParticipant.setMicrophoneEnabled(true)
  } catch (e) {
    voiceMicMuted.set(true)
    pushToast({theme: "error", message: "Could not access microphone"})
  }
}
