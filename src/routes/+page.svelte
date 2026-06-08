<script lang="ts">
  import {onMount} from "svelte"
  import {goto} from "$app/navigation"
  import {goToSpace} from "@app/routes"
  import {PLATFORM_RELAYS} from "@app/env"

  onMount(async () => {
    if (PLATFORM_RELAYS.length > 0) {
      goToSpace(PLATFORM_RELAYS[0])
    } else {
      goto("/home")
    }
  })
</script>
