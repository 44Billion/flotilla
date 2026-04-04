<script lang="ts">
  import type {Snippet} from "svelte"
  import {userProfile} from "@welshman/app"
  import Letter from "@assets/icons/letter.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import Widget from "@assets/icons/widget-4.svg?dataurl"
  import UserRounded from "@assets/icons/user-rounded.svg?dataurl"
  import Settings from "@assets/icons/settings.svg?dataurl"
  import ImageIcon from "@lib/components/ImageIcon.svelte"
  import Divider from "@lib/components/Divider.svelte"
  import MenuSettings from "@app/components/MenuSettings.svelte"
  import PrimaryNavItem from "@lib/components/PrimaryNavItem.svelte"
  import PrimaryNavSpaces from "@app/components/PrimaryNavSpaces.svelte"
  import {userSpaceUrls, PLATFORM_RELAYS} from "@app/core/state"
  import {pushModal} from "@app/util/modal"
  import {notifications} from "@app/util/notifications"
  import {goToChat, makeSpacePath} from "@app/util/routes"

  type Props = {
    children?: Snippet
  }

  const {children}: Props = $props()

  const chatHandler = () => goToChat()

  const showSettingsMenu = () => pushModal(MenuSettings)

  const anySpaceNotifications = $derived(
    $userSpaceUrls.some(p => $notifications.has(makeSpacePath(p))),
  )
</script>

<div
  class="ml-sai mt-sai mb-sai relative z-nav hidden w-14 flex-shrink-0 bg-base-200 pt-2 md:block">
  <div class="flex h-full flex-col" class:justify-between={PLATFORM_RELAYS.length === 0}>
    <PrimaryNavSpaces />
    {#if PLATFORM_RELAYS.length > 0}
      <Divider />
    {/if}
    <div>
      <PrimaryNavItem
        title="Settings"
        href="/settings/profile"
        prefix="/settings"
        class="tooltip-right">
        {#if $userProfile?.picture}
          <ImageIcon alt="Settings" src={$userProfile?.picture} class="rounded-full" size={10} />
        {:else}
          <ImageIcon alt="Settings" src={UserRounded} class="rounded-full" size={8} />
        {/if}
      </PrimaryNavItem>
      <PrimaryNavItem
        title="Messages"
        onclick={chatHandler}
        class="tooltip-right"
        notification={$notifications.has("/chat")}>
        <ImageIcon alt="Messages" src={Letter} size={8} />
      </PrimaryNavItem>
      <PrimaryNavItem title="Search" href="/people" class="tooltip-right">
        <ImageIcon alt="Search" src={Magnifier} size={8} />
      </PrimaryNavItem>
    </div>
  </div>
</div>

{@render children?.()}

<!-- a little extra something for ios -->
<div
  class="hide-on-keyboard fixed bottom-0 left-0 right-0 z-nav h-[var(--saib)] bg-base-100 md:hidden">
</div>
<div
  class="hide-on-keyboard border-top bottom-sai fixed left-0 right-0 z-nav h-14 border border-base-200 bg-base-100 md:hidden">
  <div class="content-padding-x content-sizing flex justify-between px-2">
    <div class="flex gap-2 sm:gap-6">
      <PrimaryNavItem title="Search" href="/people">
        <ImageIcon alt="Search" src={Magnifier} size={8} />
      </PrimaryNavItem>
      <PrimaryNavItem
        title="Messages"
        href="/chat"
        onclick={chatHandler}
        notification={$notifications.has("/chat")}>
        <ImageIcon alt="Messages" src={Letter} size={8} />
      </PrimaryNavItem>
      {#if PLATFORM_RELAYS.length !== 1}
        <PrimaryNavItem title="Spaces" href="/spaces" notification={anySpaceNotifications}>
          <ImageIcon alt="Spaces" src={Widget} size={8} />
        </PrimaryNavItem>
      {/if}
    </div>
    <PrimaryNavItem title="Settings" onclick={showSettingsMenu}>
      {#if $userProfile?.picture}
        <ImageIcon alt="Settings" src={$userProfile?.picture} size={10} class="rounded-full" />
      {:else}
        <ImageIcon alt="Settings" src={Settings} size={8} class="rounded-full" />
      {/if}
    </PrimaryNavItem>
  </div>
</div>
