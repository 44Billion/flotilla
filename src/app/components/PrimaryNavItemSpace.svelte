<script lang="ts">
  import {deriveRelayDisplay} from "@welshman/app"
  import PrimaryNavItem from "@lib/components/PrimaryNavItem.svelte"
  import RelayIcon from "@app/components/RelayIcon.svelte"
  import {makeSpacePath, goToSpace} from "@app/util/routes"
  import {notifications} from "@app/util/notifications"

  type Props = {
    url: string
  }

  const {url}: Props = $props()

  const onClick = () => goToSpace(url)

  const display = $derived(deriveRelayDisplay(url))
</script>

<PrimaryNavItem
  onclick={onClick}
  title={$display}
  class="tooltip-right"
  notification={$notifications.has(makeSpacePath(url))}>
  <RelayIcon {url} size={10} class="rounded-full" />
</PrimaryNavItem>
