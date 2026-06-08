<script lang="ts">
  import Bell from "@assets/icons/bell.svg?dataurl"
  import BellOff from "@assets/icons/bell-off.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import SecondaryNavItem from "@lib/components/SecondaryNavItem.svelte"
  import RoomNameWithImage from "@app/components/RoomNameWithImage.svelte"
  import VoiceRoomItem from "@app/components/VoiceRoomItem.svelte"
  import {deriveRoom, deriveShouldNotify, getRoomType, RoomType} from "@app/core/state"
  import {notifications} from "@app/notifications"
  import {makeRoomPath} from "@app/routes"

  interface Props {
    url: any
    h: any
    replaceState?: boolean
  }

  const {url, h, replaceState = false}: Props = $props()

  const room = deriveRoom(url, h)
  const roomType = $derived(getRoomType($room))
  const path = makeRoomPath(url, h)
  const shouldNotifyForSpace = deriveShouldNotify(url)
  const shouldNotifyForRoom = deriveShouldNotify(url, h)
  const showDifferenceIcon = $derived($shouldNotifyForRoom !== $shouldNotifyForSpace)
  const notification = $derived($shouldNotifyForRoom ? $notifications.has(path) : false)
  const roomName = $derived($room?.name || h)
</script>

{#if roomType === RoomType.Voice}
  <VoiceRoomItem {url} {h} {replaceState} {notification} />
{:else}
  <SecondaryNavItem href={path} title={roomName} {replaceState} {notification}>
    <RoomNameWithImage {url} {h} />
    {#if showDifferenceIcon}
      <Icon icon={$shouldNotifyForRoom ? Bell : BellOff} size={4} class="opacity-50" />
    {/if}
  </SecondaryNavItem>
{/if}
