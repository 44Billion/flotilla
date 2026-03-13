<script lang="ts">
  import {Capacitor} from "@capacitor/core"
  import {pubkey} from "@welshman/app"
  import Server from "@assets/icons/server.svg?dataurl"
  import GalleryMinimalistic from "@assets/icons/gallery-minimalistic.svg?dataurl"
  import Shield from "@assets/icons/shield-minimalistic.svg?dataurl"
  import Bell from "@assets/icons/bell.svg?dataurl"
  import Wallet from "@assets/icons/wallet.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import Button from "@lib/components/Button.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import Profile from "@app/components/Profile.svelte"
  import LogOut from "@app/components/LogOut.svelte"
  import {pushModal} from "@app/util/modal"
  import {theme} from "@app/util/theme"

  const logout = () => pushModal(LogOut)
  const toggleTheme = () => theme.set($theme === "dark" ? "light" : "dark")
</script>

<Modal>
  <ModalBody>
    <div class="flex flex-col gap-8 items-center py-12 max-w-[16rem] m-auto w-full">
      {#if $pubkey}
        <Link replaceState href="/settings/profile">
          <Profile inert pubkey={$pubkey} />
        </Link>
      {/if}
      <div class="grid grid-cols-2 gap-3 w-full">
        <Link
          replaceState
          href="/settings/alerts"
          class="aspect-square btn h-[unset] btn-neutral flex flex-col gap-4 text-center">
          <Icon icon={Bell} size={7} />
          Alerts
        </Link>
        {#if Capacitor.getPlatform() !== "ios"}
          <Link
            replaceState
            href="/settings/wallet"
            class="aspect-square btn h-[unset] btn-neutral flex flex-col gap-4 text-center">
            <Icon icon={Wallet} size={7} />
            Wallet
          </Link>
        {/if}
        <Link
          replaceState
          href="/settings/relays"
          class="aspect-square btn h-[unset] btn-neutral flex flex-col gap-4 text-center">
          <Icon icon={Server} size={7} />
          Relays
        </Link>
        <Link
          replaceState
          href="/settings/content"
          class="aspect-square btn h-[unset] btn-neutral flex flex-col gap-4 text-center">
          <Icon icon={GalleryMinimalistic} size={7} />
          Content
        </Link>
        <Link
          replaceState
          href="/settings/privacy"
          class="aspect-square btn h-[unset] btn-neutral flex flex-col gap-4 text-center">
          <Icon icon={Shield} size={7} />
          Privacy
        </Link>
      </div>
      <div class="flex gap-3 items-center opacity-75 text-sm">
        <Button onclick={toggleTheme}>Theme</Button>
        /
        <Link replaceState href="/settings/about">About</Link>
        /
        <Button onclick={logout}>Log Out</Button>
      </div>
    </div>
  </ModalBody>
</Modal>
