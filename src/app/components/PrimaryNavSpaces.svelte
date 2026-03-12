<script lang="ts">
  import {splitAt} from "@welshman/lib"
  import Widget from "@assets/icons/widget.svg?dataurl"
  import Compass from "@assets/icons/compass.svg?dataurl"
  import ImageIcon from "@lib/components/ImageIcon.svelte"
  import Divider from "@lib/components/Divider.svelte"
  import PrimaryNavItem from "@lib/components/PrimaryNavItem.svelte"
  import PrimaryNavItemSpace from "@app/components/PrimaryNavItemSpace.svelte"
  import {userSpaceUrls, PLATFORM_RELAYS, PLATFORM_LOGO} from "@app/core/state"
  import {notifications} from "@app/util/notifications"

  let windowHeight = $state(0)

  const itemHeight = 56
  const navPadding = 8 * itemHeight
  const itemLimit = $derived((windowHeight - navPadding) / itemHeight)
  const [primarySpaceUrls, secondarySpaceUrls] = $derived(splitAt(itemLimit, $userSpaceUrls))
  const otherSpaceNotifications = $derived(secondarySpaceUrls.some(p => $notifications.has(p)))
</script>

<svelte:window bind:innerHeight={windowHeight} />

<div>
  {#each PLATFORM_RELAYS as url (url)}
    <PrimaryNavItemSpace {url} />
  {:else}
    <PrimaryNavItem title="Home" href="/home" class="tooltip-right">
      <ImageIcon alt="Home" src={PLATFORM_LOGO} class="rounded-full" size={10} />
    </PrimaryNavItem>
    <Divider />
    {#each primarySpaceUrls as url (url)}
      <PrimaryNavItemSpace {url} />
    {/each}
    <PrimaryNavItem
      href="/spaces"
      title="All Spaces"
      class="tooltip-right"
      notification={otherSpaceNotifications}>
      <ImageIcon alt="All Spaces" src={Widget} size={8} />
    </PrimaryNavItem>
    <PrimaryNavItem title="Add a Space" href="/discover" class="tooltip-right">
      <ImageIcon alt="Add a Space" src={Compass} size={8} />
    </PrimaryNavItem>
  {/each}
</div>
