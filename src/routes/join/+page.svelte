<script lang="ts">
  import {page} from "$app/stores"
  import {goto} from "$app/navigation"
  import Dialog from "@lib/components/Dialog.svelte"
  import SpaceInviteAccept from "@app/components/SpaceInviteAccept.svelte"

  const close = () => goto("/home")

  const children = {
    component: SpaceInviteAccept,
    props: {
      invite: $page.url.href,
      back: close,
    },
  }
</script>

<Dialog {children} onClose={close} />
