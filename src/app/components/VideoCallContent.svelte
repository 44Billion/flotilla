<script lang="ts">
  import cx from "classnames"
  import {Track} from "livekit-client"
  import {displayProfileByPubkey, loadProfile} from "@welshman/app"
  import Pin from "@assets/icons/pin.svg?dataurl"
  import Button from "@lib/components/Button.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import ProfileCircle from "@app/components/ProfileCircle.svelte"
  import VideoCallTile from "@app/components/VideoCallTile.svelte"
  import VoiceWidget from "@app/components/VoiceWidget.svelte"
  import VoiceParticipantMediaBadges from "@app/components/VoiceParticipantMediaBadges.svelte"
  import {get} from "svelte/store"
  import {
    VideoCallLayout,
    isDesktopLayout,
    toggleVideoPrimaryTile,
    videoCallLayout,
    videoCallViewportSync,
    ViewportSize,
    videoPrimaryTileKey,
  } from "@app/call/video"
  import {
    currentVoiceSession,
    currentVoiceRoom,
    mediaStateByIdentity,
    pubkeyFromLiveKitIdentity,
  } from "@app/call/stores"

  type Props = {
    layout: VideoCallLayout
    mobile?: boolean
    url: string
    h: string
    class?: string
  }

  type VideoTileData = {
    identity: string
    isLocal: boolean
    trackSid: string
    track: Track | undefined
    source: Track.Source.Camera | Track.Source.ScreenShare
  }

  type TileLayout = "spotlight" | "default" | "strip"

  const {layout, mobile = false, url, h, class: className = ""}: Props = $props()

  $effect(() => {
    const currentLayout = isDesktopLayout.current ? ViewportSize.Desktop : ViewportSize.Mobile
    const {previousLayout} = videoCallViewportSync
    if (previousLayout === undefined) {
      videoCallViewportSync.previousLayout = currentLayout
      return
    }
    if (previousLayout === currentLayout) return
    const p = get(videoCallLayout)
    if (previousLayout === ViewportSize.Desktop && currentLayout === ViewportSize.Mobile) {
      if (p === VideoCallLayout.Split) videoCallLayout.set(VideoCallLayout.Video)
    } else if (previousLayout === ViewportSize.Mobile && currentLayout === ViewportSize.Desktop) {
      if (p === VideoCallLayout.Chat) videoCallLayout.set(VideoCallLayout.Split)
    }
    videoCallViewportSync.previousLayout = currentLayout
  })

  const isViewingCurrentCallRoom = $derived(
    $currentVoiceRoom?.url === url && $currentVoiceRoom?.h === h,
  )

  const showVideoContent = $derived(
    isViewingCurrentCallRoom &&
      (mobile
        ? layout === VideoCallLayout.Video
        : layout === VideoCallLayout.Split || layout === VideoCallLayout.Video),
  )

  const videoTiles = $derived.by(() => {
    const session = $currentVoiceSession
    if (!session || $currentVoiceRoom?.url !== url || $currentVoiceRoom?.h !== h) {
      return []
    }

    const room = session.room
    const videoTiles: VideoTileData[] = []
    const user = room.localParticipant

    if (session.cameraOn) {
      const localPub = user.getTrackPublication(Track.Source.Camera)
      videoTiles.push({
        identity: user.identity,
        isLocal: true,
        trackSid: localPub?.trackSid ?? "local-camera",
        track: localPub?.track,
        source: Track.Source.Camera,
      })
    }

    if (session.screenShareOn) {
      const localPub = user.getTrackPublication(Track.Source.ScreenShare)
      videoTiles.push({
        identity: user.identity,
        isLocal: true,
        trackSid: localPub?.trackSid ?? "local-screen",
        track: localPub?.track,
        source: Track.Source.ScreenShare,
      })
    }

    for (const rp of room.remoteParticipants.values()) {
      const camPub = rp.getTrackPublication(Track.Source.Camera)
      if (camPub?.isSubscribed && camPub.track) {
        videoTiles.push({
          identity: rp.identity,
          isLocal: false,
          trackSid: camPub.trackSid,
          track: camPub.track,
          source: Track.Source.Camera,
        })
      }
      const screenPub = rp.getTrackPublication(Track.Source.ScreenShare)
      if (screenPub?.isSubscribed && screenPub.track) {
        videoTiles.push({
          identity: rp.identity,
          isLocal: false,
          trackSid: screenPub.trackSid,
          track: screenPub.track,
          source: Track.Source.ScreenShare,
        })
      }
      if (!videoTiles.some(t => t.identity === rp.identity)) {
        videoTiles.push({
          identity: rp.identity,
          isLocal: false,
          trackSid: `avatar-${rp.identity}`,
          track: undefined,
          source: Track.Source.Camera,
        })
      }
    }

    if (!videoTiles.some(t => t.identity === user.identity)) {
      videoTiles.push({
        identity: user.identity,
        isLocal: true,
        trackSid: "local-avatar",
        track: undefined,
        source: Track.Source.Camera,
      })
    }

    return videoTiles
  })

  /** Identity + source only — LiveKit can change trackSid after publish, which broke spotlight + stale-key effect. */
  const tileKey = (t: VideoTileData) => `${t.identity}\x1f${t.source}`

  const primaryTile = $derived.by(() => {
    const k = $videoPrimaryTileKey
    if (k === undefined) return undefined
    return videoTiles.find(t => tileKey(t) === k)
  })

  const secondaryTiles = $derived.by(() => {
    const p = primaryTile
    if (p === undefined) return videoTiles
    const pk = tileKey(p)
    return videoTiles.filter(t => tileKey(t) !== pk)
  })

  const useSpotlightLayout = $derived(primaryTile !== undefined)
  const useMultiGrid = $derived(!useSpotlightLayout && videoTiles.length > 2)
  const multiGridClass = $derived(
    layout === VideoCallLayout.Split ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
  )

  $effect(() => {
    const k = $videoPrimaryTileKey
    if (k === undefined) return
    if (!videoTiles.some(t => tileKey(t) === k)) {
      videoPrimaryTileKey.set(undefined)
    }
  })

  $effect(() => {
    for (const t of videoTiles) {
      const pk = pubkeyFromLiveKitIdentity(t.identity)
      if (pk) loadProfile(pk)
    }
  })

  const labelFor = (identity: string, source: VideoTileData["source"]) => {
    const pk = pubkeyFromLiveKitIdentity(identity)
    const name = pk ? displayProfileByPubkey(pk) : "Unknown"
    return source === Track.Source.ScreenShare ? `${name} · screen` : name
  }

  const showTileGrid = $derived(videoTiles.length > 0)

  const spotlightHandlerFor = (key: string) => () => {
    toggleVideoPrimaryTile(key)
  }

  const panelChrome = $derived(
    cx(
      mobile &&
        "flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden bg-base-200 px-2 pt-4 md:hidden pb-[calc(3.5rem+var(--saib))]",
      !mobile &&
        "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden bg-base-200 px-2 pb-2 pt-4",
      className,
    ),
  )
</script>

{#snippet videoTile(tile: VideoTileData, layout: TileLayout)}
  {@const media = $mediaStateByIdentity(tile.identity)}
  <div
    class={cx(
      "relative isolate overflow-hidden rounded-box shadow-sm",
      layout === "spotlight" && "min-h-0 flex-1",
      layout === "default" && "aspect-video w-full min-h-0",
      layout === "strip" && "aspect-video w-44 shrink-0",
      tile.source === Track.Source.ScreenShare ? "bg-black" : "bg-base-100",
    )}>
    {#if tile.track}
      <VideoCallTile
        track={tile.track}
        muted={tile.isLocal}
        fit={tile.source === Track.Source.ScreenShare ? "contain" : "cover"}
        class="pointer-events-none absolute inset-0" />
    {:else}
      <div class="absolute inset-0 flex items-center justify-center">
        <ProfileCircle pubkey={pubkeyFromLiveKitIdentity(tile.identity)} {url} size={14} />
      </div>
    {/if}
    {#if tile.track}
      <div class="pointer-events-none absolute left-1 top-1 z-10">
        <VoiceParticipantMediaBadges
          muted={media.muted}
          cameraOn={media.cameraOn}
          showCamera={tile.source === Track.Source.Camera}
          size={3} />
      </div>
    {/if}
    <span
      class="pointer-events-none absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-base-100/80 px-1.5 py-0.5 text-xs">
      {labelFor(tile.identity, tile.source)}{tile.isLocal ? " (you)" : ""}
    </span>
    {#if videoTiles.length > 1}
      {@const pinned = $videoPrimaryTileKey === tileKey(tile)}
      <Button
        data-tip={pinned ? "Exit spotlight" : "Spotlight"}
        aria-pressed={pinned}
        class={cx(
          "absolute right-1 top-1 z-20 btn btn-xs btn-square btn-ghost",
          pinned ? "btn-active bg-primary/25 text-primary" : "bg-base-100/70",
        )}
        onclick={spotlightHandlerFor(tileKey(tile))}>
        <Icon icon={Pin} size={3} />
      </Button>
    {/if}
  </div>
{/snippet}

{#snippet videoPanelBody()}
  {#if showTileGrid}
    {#if useSpotlightLayout && primaryTile}
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {@render videoTile(primaryTile, "spotlight")}
        {#if secondaryTiles.length > 0}
          <div
            class="flex max-h-40 shrink-0 flex-row gap-2 overflow-x-auto overflow-y-hidden py-0.5">
            {#each secondaryTiles as tile (tileKey(tile))}
              {@render videoTile(tile, "strip")}
            {/each}
          </div>
        {/if}
      </div>
    {:else if useMultiGrid}
      <div class={cx("grid min-h-0 flex-1 content-start gap-2 overflow-y-auto", multiGridClass)}>
        {#each videoTiles as tile (tileKey(tile))}
          {@render videoTile(tile, "default")}
        {/each}
      </div>
    {:else}
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {#each videoTiles as tile (tileKey(tile))}
          {@render videoTile(tile, "default")}
        {/each}
      </div>
    {/if}
  {:else}
    <div
      class="flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-2 rounded-box bg-base-200/50 p-4 text-center text-sm opacity-80">
      <p>No one is sharing video yet.</p>
      <p class="text-xs">
        Participants appear here when they turn on their camera or share their screen.
      </p>
    </div>
  {/if}
{/snippet}

{#if showVideoContent}
  <div class={panelChrome}>
    {#if mobile}
      <div class="flex min-h-0 flex-1 flex-col gap-2">
        <div class="min-h-0 flex-1 overflow-hidden">
          {@render videoPanelBody()}
        </div>
        <div class="shrink-0 pb-2">
          <VoiceWidget />
        </div>
      </div>
    {:else}
      {@render videoPanelBody()}
    {/if}
  </div>
{/if}
