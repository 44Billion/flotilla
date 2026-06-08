<script lang="ts">
  import {deriveRelayDisplay} from "@welshman/app"
  import PrimaryNavItem from "@lib/components/PrimaryNavItem.svelte"
  import RelayIcon from "@app/components/RelayIcon.svelte"
  import {makeSpacePath, goToSpace} from "@app/routes"
  import {notifications} from "@app/notifications"

  type Props = {
    url: string
  }

  const {url}: Props = $props()

  const onClick = () => goToSpace(url)

  const path = makeSpacePath(url)

  const display = $derived(deriveRelayDisplay(url))
</script>

<PrimaryNavItem
  href={path}
  onclick={onClick}
  title={$display}
  class="tooltip-right"
  notification={$notifications.has(path)}>
  <RelayIcon {url} size={10} class="rounded-full" />
</PrimaryNavItem>
