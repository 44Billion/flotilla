import {Track} from "livekit-client"
import {MediaQuery} from "svelte/reactivity"
import {derived, get, writable} from "svelte/store"
import {currentVoiceSession, VoiceState, type VoiceSession, voiceState} from "@app/call/stores"
import {pushToast} from "@app/toast"

export enum VideoCallLayout {
  Chat = "chat",
  Video = "video",
  Split = "split",
}

export const isDesktopLayout = new MediaQuery("min-width: 768px", false)

export enum ViewportSize {
  Desktop = "desktop",
  Mobile = "mobile",
}

export const videoCallViewportSync = {
  previousLayout: undefined as ViewportSize | undefined,
}

export const videoCallLayout = writable<VideoCallLayout>(VideoCallLayout.Split)

export const resetVideoCallLayout = () => {
  videoCallViewportSync.previousLayout = undefined
  videoCallLayout.set(VideoCallLayout.Chat)
}

export const videoPrimaryTileKey = writable<string | undefined>(undefined)

export const toggleVideoPrimaryTile = (key: string) => {
  videoPrimaryTileKey.update(k => (k === key ? undefined : key))
}

const VISUAL_SOURCES = [Track.Source.Camera, Track.Source.ScreenShare] as const

const countLiveVisualFeeds = (session: VoiceSession): number => {
  const room = session.room
  let n = 0
  const lp = room.localParticipant
  if (session.cameraOn) {
    const pub = lp.getTrackPublication(Track.Source.Camera)
    if (pub?.track) n += 1
  }
  if (session.screenShareOn) {
    const pub = lp.getTrackPublication(Track.Source.ScreenShare)
    if (pub?.track) n += 1
  }
  for (const rp of room.remoteParticipants.values()) {
    for (const source of VISUAL_SOURCES) {
      const pub = rp.getTrackPublication(source)
      if (pub?.isSubscribed && pub.track) n += 1
    }
  }
  return n
}

export const triggerVideoFeedCount = () => {
  currentVoiceSession.update(s => (s ? {...s} : s))
}

export const videoTileCount = derived([currentVoiceSession, voiceState], ([$session, $state]) => {
  if ($state !== VoiceState.Connected || !$session) return 0
  return countLiveVisualFeeds($session)
})

export const toggleCamera = async () => {
  const session = get(currentVoiceSession)
  if (!session) return

  const cameraOn = !session.cameraOn
  try {
    await session.room.localParticipant.setCameraEnabled(cameraOn)
    currentVoiceSession.set({...session, cameraOn})
  } catch {
    pushToast({
      theme: "error",
      message: cameraOn ? "Could not access camera" : "Could not turn off camera",
    })
  }
}

export const toggleScreenShare = async () => {
  const session = get(currentVoiceSession)
  if (!session) return

  const screenShareOn = !session.screenShareOn
  try {
    await session.room.localParticipant.setScreenShareEnabled(screenShareOn)
    currentVoiceSession.set({...session, screenShareOn})
  } catch {
    pushToast({
      theme: "error",
      message: screenShareOn ? "Could not start screen sharing" : "Could not stop screen sharing",
    })
  }
}
