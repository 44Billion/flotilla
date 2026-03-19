<script lang="ts">
  import {onMount} from "svelte"
  import {derived} from "svelte/store"
  import {displayRelayUrl, EVENT_TIME, ZAP_GOAL, THREAD, CLASSIFIED} from "@welshman/util"
  import {deriveRelay, createSearch, pubkey} from "@welshman/app"
  import {fly} from "@lib/transition"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import AltArrowDown from "@assets/icons/alt-arrow-down.svg?dataurl"
  import RemoteControllerMinimalistic from "@assets/icons/remote-controller-minimalistic.svg?dataurl"
  import UserRounded from "@assets/icons/user-rounded.svg?dataurl"
  import Danger from "@assets/icons/danger.svg?dataurl"
  import LinkRound from "@assets/icons/link-round.svg?dataurl"
  import Exit from "@assets/icons/logout-3.svg?dataurl"
  import Letter from "@assets/icons/letter.svg?dataurl"
  import Login from "@assets/icons/login-3.svg?dataurl"
  import History from "@assets/icons/history.svg?dataurl"
  import StarFallMinimalistic from "@assets/icons/star-fall-minimalistic-2.svg?dataurl"
  import NotesMinimalistic from "@assets/icons/notes-minimalistic.svg?dataurl"
  import CalendarMinimalistic from "@assets/icons/calendar-minimalistic.svg?dataurl"
  import CaseMinimalistic from "@assets/icons/case-minimalistic.svg?dataurl"
  import AddCircle from "@assets/icons/add-circle.svg?dataurl"
  import ChatRound from "@assets/icons/chat-round.svg?dataurl"
  import Bell from "@assets/icons/bell.svg?dataurl"
  import BellOff from "@assets/icons/bell-off.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import Button from "@lib/components/Button.svelte"
  import Popover from "@lib/components/Popover.svelte"
  import SecondaryNavItem from "@lib/components/SecondaryNavItem.svelte"
  import SecondaryNavHeader from "@lib/components/SecondaryNavHeader.svelte"
  import SecondaryNavSection from "@lib/components/SecondaryNavSection.svelte"
  import SpaceDetail from "@app/components/SpaceDetail.svelte"
  import SpaceInvite from "@app/components/SpaceInvite.svelte"
  import SpaceExit from "@app/components/SpaceExit.svelte"
  import SpaceJoin from "@app/components/SpaceJoin.svelte"
  import RelayName from "@app/components/RelayName.svelte"
  import SpaceMembers from "@app/components/SpaceMembers.svelte"
  import SpaceActionItems from "@app/components/SpaceActionItems.svelte"
  import RoomCreate from "@app/components/RoomCreate.svelte"
  import SpaceMenuRoomItem from "@app/components/SpaceMenuRoomItem.svelte"
  import VoiceWidget from "@app/components/VoiceWidget.svelte"
  import SocketStatusIndicator from "@app/components/SocketStatusIndicator.svelte"
  import {
    ENABLE_ZAPS,
    CONTENT_KINDS,
    deriveSpaceMembers,
    deriveUserRooms,
    deriveOtherRooms,
    deriveOtherVoiceRooms,
    userSpaceUrls,
    hasNip29,
    deriveUserCanCreateRoom,
    deriveUserIsSpaceAdmin,
    deriveEventsForUrl,
    deriveSpaceActionItems,
    notificationSettings,
    deriveShouldNotify,
    displayRoom,
  } from "@app/core/state"
  import {setSpaceNotifications} from "@app/core/commands"
  import {pushModal} from "@app/util/modal"
  import {makeSpacePath, makeChatPath} from "@app/util/routes"

  const {url} = $props()

  const relay = deriveRelay(url)
  const chatPath = makeSpacePath(url, "chat")
  const goalsPath = makeSpacePath(url, "goals")
  const threadsPath = makeSpacePath(url, "threads")
  const classifiedsPath = makeSpacePath(url, "classifieds")
  const calendarPath = makeSpacePath(url, "calendar")
  const userRooms = deriveUserRooms(url)
  const otherRooms = deriveOtherRooms(url)
  const otherVoiceRooms = deriveOtherVoiceRooms(url)
  const members = deriveSpaceMembers(url)
  const userIsAdmin = deriveUserIsSpaceAdmin(url)
  const actionItems = deriveSpaceActionItems(url)

  const spaceKinds = derived(
    deriveEventsForUrl(url, [{kinds: CONTENT_KINDS}]),
    $events => new Set($events.map(e => e.kind)),
  )

  const roomSearch = derived(otherRooms, $otherRooms =>
    createSearch(
      $otherRooms.map(h => ({h, name: displayRoom(url, h)})),
      {
        getValue: item => item.h,
        fuseOptions: {keys: ["name"]},
      },
    ),
  )

  const openMenu = () => {
    showMenu = true
  }

  const toggleMenu = () => {
    showMenu = !showMenu
  }

  const showDetail = () => pushModal(SpaceDetail, {url}, {replaceState})

  const showMembers = () => pushModal(SpaceMembers, {url}, {replaceState})

  const showActionItems = () => pushModal(SpaceActionItems, {url}, {replaceState})

  const canCreateRoom = deriveUserCanCreateRoom(url)

  const createInvite = () => pushModal(SpaceInvite, {url}, {replaceState})

  const leaveSpace = () => pushModal(SpaceExit, {url}, {replaceState})

  const joinSpace = () => pushModal(SpaceJoin, {url}, {replaceState})

  const addRoom = () => pushModal(RoomCreate, {url}, {replaceState})

  const shouldNotify = deriveShouldNotify(url)

  const toggleSpaceNotifications = () => {
    setSpaceNotifications(url, !$shouldNotify)
  }

  const clearTerm = () => {
    setTimeout(() => {
      term = ""
    }, 100)
  }

  let term = $state("")
  let showMenu = $state(false)
  let replaceState = $state(false)
  let element: Element | undefined = $state()

  onMount(() => {
    replaceState = Boolean(element?.closest(".drawer"))
  })
</script>

<div bind:this={element} class="flex min-h-0 flex-1 flex-col">
  <SecondaryNavSection class="min-h-0 flex-1 flex flex-col overflow-hidden pb-0">
    <div class="flex-shrink-0">
      <Button
        class="relative flex w-full flex-col rounded-xl p-3 transition-all hover:bg-base-100"
        onclick={openMenu}>
        <div class="flex items-center justify-between">
          <strong class="flex items-center gap-1 relative">
            <RelayName {url} class="ellipsize" />
            <div
              class="absolute -right-3 top-0 h-2 w-2 rounded-full bg-primary transition-all opacity-0"
              class:opacity-100={$userIsAdmin && $actionItems.length > 0}>
            </div>
            {#if $notificationSettings.push && !$shouldNotify}
              <Icon icon={BellOff} size={3} class="opacity-50" />
            {/if}
          </strong>
          <Icon icon={AltArrowDown} />
        </div>
        <span class="text-xs text-primary">{displayRelayUrl(url)}</span>
      </Button>
      {#if showMenu}
        <Popover hideOnClick onClose={toggleMenu}>
          <ul
            transition:fly
            class="menu absolute z-popover mt-2 w-full gap-1 rounded-box bg-base-100 p-2 shadow-md">
            <li>
              <Button onclick={createInvite}>
                <Icon icon={LinkRound} />
                Create Invite
              </Button>
            </li>
            <li>
              <Button onclick={showDetail}>
                <Icon icon={RemoteControllerMinimalistic} />
                Space Information
              </Button>
            </li>
            <li>
              <Button onclick={showMembers}>
                <Icon icon={UserRounded} />
                View Members ({$members.length})
              </Button>
            </li>
            {#if $userIsAdmin}
              <li>
                <Button onclick={showActionItems}>
                  <Icon icon={Danger} />
                  Action Items ({$actionItems.length})
                  {#if $actionItems.length > 0}
                    <div class="h-2 w-2 rounded-full bg-primary"></div>
                  {/if}
                </Button>
              </li>
            {/if}
            {#if $relay?.pubkey && $relay.pubkey !== $pubkey}
              <li>
                <Link href={makeChatPath([$relay.pubkey])}>
                  <Icon icon={Letter} />
                  Contact Owner
                </Link>
              </li>
            {/if}
            <li>
              {#if $notificationSettings.push}
                <Button onclick={toggleSpaceNotifications}>
                  <Icon icon={$shouldNotify ? Bell : BellOff} />
                  {$shouldNotify ? "Turn off" : "Turn on"} notifications
                </Button>
              {:else}
                <Link href="/settings/alerts">
                  <Icon icon={Bell} />
                  Enable notifications
                </Link>
              {/if}
            </li>
            <li>
              {#if $userSpaceUrls.includes(url)}
                <Button onclick={leaveSpace} class="text-error">
                  <Icon icon={Exit} />
                  Leave Space
                </Button>
              {:else}
                <Button onclick={joinSpace} class="bg-primary text-primary-content">
                  <Icon icon={Login} />
                  Join Space
                </Button>
              {/if}
            </li>
          </ul>
        </Popover>
      {/if}
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-auto overflow-x-hidden">
      {#if hasNip29($relay)}
        <SecondaryNavItem {replaceState} href={makeSpacePath(url, "recent")}>
          <Icon icon={History} /> Recent Activity
        </SecondaryNavItem>
      {:else}
        <SecondaryNavItem {replaceState} href={chatPath}>
          <Icon icon={ChatRound} /> Chat
        </SecondaryNavItem>
      {/if}
      {#if ENABLE_ZAPS && $spaceKinds.has(ZAP_GOAL)}
        <SecondaryNavItem {replaceState} href={goalsPath}>
          <Icon icon={StarFallMinimalistic} /> Goals
        </SecondaryNavItem>
      {/if}
      {#if $spaceKinds.has(THREAD)}
        <SecondaryNavItem {replaceState} href={threadsPath}>
          <Icon icon={NotesMinimalistic} /> Threads
        </SecondaryNavItem>
      {/if}
      {#if $spaceKinds.has(CLASSIFIED)}
        <SecondaryNavItem {replaceState} href={classifiedsPath}>
          <Icon icon={CaseMinimalistic} /> Classifieds
        </SecondaryNavItem>
      {/if}
      {#if $spaceKinds.has(EVENT_TIME)}
        <SecondaryNavItem {replaceState} href={calendarPath}>
          <Icon icon={CalendarMinimalistic} /> Calendar
        </SecondaryNavItem>
      {/if}
      {#if hasNip29($relay)}
        {#if $userRooms.length > 0}
          <div class="h-2 flex-shrink-0"></div>
          <SecondaryNavHeader>Your Rooms</SecondaryNavHeader>
        {/if}
        {#each $userRooms as h (h)}
          <SpaceMenuRoomItem {replaceState} {url} {h} />
        {/each}
        {#if $otherRooms.length > 0}
          <div class="h-2 flex-shrink-0"></div>
          <SecondaryNavHeader>
            {#if $userRooms.length > 0}
              Other Rooms
            {:else}
              Rooms
            {/if}
          </SecondaryNavHeader>
        {/if}
        {#if $otherRooms.length > 20}
          <label class="input input-sm input-bordered flex items-center gap-2">
            <Icon icon={Magnifier} />
            <input bind:value={term} onblur={clearTerm} class="grow" />
          </label>
        {/if}
        {#each $roomSearch.searchValues(term) as h (h)}
          <SpaceMenuRoomItem {replaceState} {url} {h} />
        {/each}
        {#if $otherVoiceRooms.length > 0}
          <div class="h-2 flex-shrink-0"></div>
          <SecondaryNavHeader>Voice Rooms</SecondaryNavHeader>
          {#each $otherVoiceRooms as h (h)}
            <SpaceMenuRoomItem {replaceState} {url} {h} />
          {/each}
        {/if}
        {#if $canCreateRoom}
          <SecondaryNavItem {replaceState} onclick={addRoom}>
            <Icon icon={AddCircle} />
            Create room
          </SecondaryNavItem>
        {/if}
      {/if}
      <div class="h-5 flex-shrink-0"></div>
    </div>
  </SecondaryNavSection>
  <div
    class="flex flex-shrink-0 flex-col gap-2 p-2 pt-0 -mt-4 pb-[calc(var(--saib)+3rem)] md:pb-2 z-nav">
    <VoiceWidget />
    <Button class="btn btn-neutral btn-sm h-10" onclick={showDetail}>
      <SocketStatusIndicator {url} />
    </Button>
  </div>
</div>
