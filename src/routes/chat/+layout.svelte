<script lang="ts">
  import type {Snippet} from "svelte"
  import {onMount} from "svelte"
  import {page} from "$app/stores"
  import {sleep} from "@welshman/lib"
  import {shouldUnwrap} from "@welshman/app"
  import MenuDots from "@assets/icons/menu-dots.svg?dataurl"
  import ChatSquarePlus from "@assets/icons/chat-square-plus.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Page from "@lib/components/Page.svelte"
  import Button from "@lib/components/Button.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import FAB from "@lib/components/FAB.svelte"
  import SecondaryNav from "@lib/components/SecondaryNav.svelte"
  import SecondaryNavHeader from "@lib/components/SecondaryNavHeader.svelte"
  import SecondaryNavSection from "@lib/components/SecondaryNavSection.svelte"
  import ChatMenu from "@app/components/ChatMenu.svelte"
  import ChatStart from "@app/components/ChatStart.svelte"
  import ChatItem from "@app/components/ChatItem.svelte"
  import {chatSearch} from "@app/chats"
  import {pushModal} from "@app/modal"

  type Props = {
    children?: Snippet
  }

  const {children}: Props = $props()

  const openMenu = () => pushModal(ChatMenu)

  const startChat = () => pushModal(ChatStart)

  let term = $state("")

  const chats = $derived($chatSearch.searchOptions(term))

  const promise = sleep(10000)

  onMount(() => {
    shouldUnwrap.set(true)
  })
</script>

<SecondaryNav class="relative">
  <SecondaryNavSection>
    <SecondaryNavHeader>
      Chats
      <Button onclick={openMenu}>
        <Icon icon={MenuDots} />
      </Button>
    </SecondaryNavHeader>
    <Button class="btn btn-primary w-full btn-sm" onclick={startChat}>
      <Icon icon={ChatSquarePlus} />
      Start New Chat
    </Button>
    <label class="input input-sm input-bordered flex items-center gap-2">
      <Icon icon={Magnifier} />
      <input bind:value={term} class="grow" type="text" />
    </label>
  </SecondaryNavSection>
  <div class="overflow-auto">
    {#each chats as { id, pubkeys, messages } (id)}
      <ChatItem {id} {pubkeys} {messages} />
    {/each}
    {#await promise}
      <div class="border-t border-solid border-base-100 px-6 py-4 text-xs">
        <Spinner loading>Loading conversations...</Spinner>
      </div>
    {/await}
  </div>
</SecondaryNav>
<Page>
  {#key $page.url.pathname}
    {@render children?.()}
  {/key}
</Page>

{#if !$page.params.chat}
  <FAB onclick={startChat}>
    <Icon icon={ChatSquarePlus} size={7} />
  </FAB>
{/if}
