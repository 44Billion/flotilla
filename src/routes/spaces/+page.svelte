<script lang="ts">
  import {onMount, tick} from "svelte"
  import {flip} from "svelte/animate"
  import {cubicOut} from "svelte/easing"
  import {derived as _derived} from "svelte/store"
  import {dec, insertAt, removeAt, sleep} from "@welshman/lib"
  import type {RelayProfile} from "@welshman/util"
  import {ROOMS} from "@welshman/util"
  import {throttled} from "@welshman/store"
  import {pull, relays, createSearch} from "@welshman/app"
  import {createScroller} from "@lib/html"
  import {fly} from "@lib/transition"
  import DragHandle from "@assets/icons/drag-handle.svg?dataurl"
  import Widget from "@assets/icons/widget-4.svg?dataurl"
  import AddCircle from "@assets/icons/add-circle.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import Page from "@lib/components/Page.svelte"
  import PageBar from "@lib/components/PageBar.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import Divider from "@lib/components/Divider.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import RelaySummary from "@app/components/RelaySummary.svelte"
  import SpaceAdd from "@app/components/SpaceAdd.svelte"
  import SpaceInviteAccept from "@app/components/SpaceInviteAccept.svelte"
  import SpaceJoin from "@app/components/SpaceJoin.svelte"
  import {
    userSpaceUrls,
    loadUserGroupList,
    PLATFORM_RELAYS,
    DEFAULT_RELAYS,
    groupListPubkeysByUrl,
    bootstrapPubkeys,
    parseInviteLink,
  } from "@app/core/state"
  import {setSpaceMembershipOrder} from "@app/core/commands"
  import {pushModal} from "@app/modal"
  import {goToSpace, makeSpacePath} from "@app/routes"
  import {notifications} from "@app/notifications"

  const addSpace = () => pushModal(SpaceAdd)

  const relaySearch = _derived(throttled(1000, relays), $relays => {
    const options = $relays.filter(r => $groupListPubkeysByUrl.has(r.url))

    return createSearch(options, {
      getValue: (relay: RelayProfile) => relay.url,
      sortFn: ({score, item}) => {
        if (score && score > 0.1) return -score!

        const wotScore = $groupListPubkeysByUrl.get(item.url)?.size || 0

        return score ? dec(score) * wotScore : -wotScore
      },
      fuseOptions: {
        keys: ["url", "name", {name: "description", weight: 0.3}],
        shouldSort: false,
      },
    })
  })

  const openSpace = (url: string, claim = "") => {
    if ($userSpaceUrls.includes(url)) {
      goToSpace(url)
    } else if (claim) {
      pushModal(SpaceInviteAccept, {invite: term})
    } else {
      pushModal(SpaceJoin, {url})
    }
  }

  const reconcileUrls = (currentUrls: string[], nextUrls: string[]) => {
    const mergedUrls = currentUrls.filter(url => nextUrls.includes(url))

    for (const url of nextUrls) {
      if (!mergedUrls.includes(url)) {
        mergedUrls.push(url)
      }
    }

    return mergedUrls
  }

  const isSameOrder = (a: string[], b: string[]) =>
    a.length === b.length && a.every((url, index) => url === b[index])

  const reorderSpaceUrls = (targetUrl: string) => {
    if (!draggedUrl) return

    const sourceIndex = orderedSpaceUrls.indexOf(draggedUrl)
    const targetIndex = orderedSpaceUrls.indexOf(targetUrl)

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return

    orderedSpaceUrls = insertAt(
      targetIndex,
      orderedSpaceUrls[sourceIndex],
      removeAt(sourceIndex, orderedSpaceUrls),
    )
  }

  const onDragStart = (e: DragEvent, url: string) => {
    draggedUrl = url
    dragStartOrder = [...orderedSpaceUrls]
    lastDragTarget = undefined
    didDrop = false

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", url)
    }
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const onDragEnter = (e: DragEvent, targetUrl: string) => {
    e.preventDefault()

    if (lastDragTarget === targetUrl) return

    lastDragTarget = targetUrl
    reorderSpaceUrls(targetUrl)
  }

  const onDrop = (e: DragEvent, targetUrl: string) => {
    e.preventDefault()
    reorderSpaceUrls(targetUrl)
    didDrop = true
    draggedUrl = undefined
    lastDragTarget = undefined

    if (dragStartOrder && !isSameOrder(dragStartOrder, orderedSpaceUrls)) {
      void setSpaceMembershipOrder(orderedSpaceUrls).catch(console.error)
    }

    dragStartOrder = undefined
  }

  const onDragEnd = () => {
    if (!didDrop && dragStartOrder && !isSameOrder(dragStartOrder, orderedSpaceUrls)) {
      orderedSpaceUrls = dragStartOrder
    }

    draggedUrl = undefined
    dragStartOrder = undefined
    lastDragTarget = undefined
    didDrop = false
  }

  $effect(() => {
    const nextUrls = reconcileUrls(orderedSpaceUrls, $userSpaceUrls)

    if (!isSameOrder(nextUrls, orderedSpaceUrls)) {
      orderedSpaceUrls = nextUrls
    }
  })

  let term = $state("")
  let showSearch = $state(false)
  let searchInput: HTMLInputElement | undefined = $state()
  let limit = $state(20)
  let element: Element
  let orderedSpaceUrls = $state<string[]>([])
  let draggedUrl = $state<string | undefined>()
  let dragStartOrder = $state<string[] | undefined>()
  let lastDragTarget = $state<string | undefined>()
  let didDrop = $state(false)

  const openSearch = () => {
    showSearch = true
    tick().then(() => searchInput?.focus())
  }

  const closeSearch = () => {
    showSearch = false
    term = ""
  }

  const inviteData = $derived(parseInviteLink(term))
  const searchResults = $derived($relaySearch.searchOptions(term))
  const userSpaceSet = $derived(new Set($userSpaceUrls))
  const filteredUserUrls = $derived(
    term
      ? orderedSpaceUrls.filter(url => searchResults.some(r => r.url === url))
      : orderedSpaceUrls,
  )
  const otherSpaces = $derived(
    searchResults.filter(r => !userSpaceSet.has(r.url) && r.url !== inviteData?.url),
  )

  onMount(() => {
    const scroller = createScroller({
      element,
      onScroll: () => {
        limit += 20
      },
    })

    pull({
      filters: [{kinds: [ROOMS], authors: $bootstrapPubkeys}],
      relays: DEFAULT_RELAYS,
    })

    return () => {
      scroller.stop()
    }
  })
</script>

<Page>
  <PageBar>
    <div class="flex items-center justify-between gap-4" in:fly>
      <div class="ellipsize flex items-center gap-2 whitespace-nowrap">
        <Icon icon={Widget} size={6} />
        <strong>Spaces</strong>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-neutral btn-sm btn-square" aria-label="Search" onclick={openSearch}>
          <Icon size={4} icon={Magnifier} />
        </button>
        {#if showSearch}
          <button class="fixed inset-0 z-feature" aria-label="Close search" onclick={closeSearch}
          ></button>
          <div class="fixed top-sai right-sai left-content-full z-feature p-2">
            <div
              class="card2 card2-sm p-2! bg-alt flex flex-col shadow-md"
              transition:fly={{y: -40, duration: 150}}>
              <label class="input input-sm input-bordered flex w-full items-center gap-2">
                <Icon size={4} icon={Magnifier} />
                <input
                  bind:this={searchInput}
                  bind:value={term}
                  class="min-w-0 grow"
                  type="text"
                  placeholder="Search for spaces..."
                  onkeydown={e => e.key === "Escape" && closeSearch()} />
                <Button onclick={closeSearch} class="flex items-center">
                  <Icon icon={CloseCircle} />
                </Button>
              </label>
            </div>
          </div>
        {/if}
        {#if PLATFORM_RELAYS.length === 0}
          <Button class="btn btn-primary btn-sm" onclick={addSpace}>
            <Icon icon={AddCircle} />
            Add Space
          </Button>
        {/if}
      </div>
    </div>
  </PageBar>
  <PageContent class="flex flex-col gap-2 p-2">
    <div class="flex flex-col gap-2" bind:this={element}>
      {#each PLATFORM_RELAYS as url (url)}
        <Button
          class="card2 bg-alt shadow-md transition-all hover:shadow-lg hover:dark:brightness-[1.1]"
          onclick={() => openSpace(url)}>
          <RelaySummary {url} />
        </Button>
      {:else}
        {#await loadUserGroupList()}
          <div class="flex items-center justify-center py-20">
            <span class="loading loading-spinner mr-3"></span>
            Loading your spaces...
          </div>
        {:then}
          {#if inviteData}
            <Divider>Search results</Divider>
            {#key inviteData.url}
              <Button
                class="card2 bg-alt shadow-md transition-all hover:shadow-lg hover:dark:brightness-[1.1]"
                onclick={() => openSpace(inviteData.url, inviteData.claim)}>
                <RelaySummary url={inviteData.url} />
              </Button>
            {/key}
          {/if}
          {#if filteredUserUrls.length > 0}
            <Divider>Your spaces</Divider>
            {#each filteredUserUrls as url (url)}
              <div
                animate:flip={{duration: 300, easing: cubicOut}}
                class="transition-opacity duration-200 {draggedUrl === url ? 'opacity-50' : ''}"
                draggable="true"
                role="listitem"
                ondragstart={e => onDragStart(e, url)}
                ondragover={onDragOver}
                ondragenter={e => onDragEnter(e, url)}
                ondrop={e => onDrop(e, url)}
                ondragend={onDragEnd}>
                <Button
                  class="group card2 bg-alt shadow-md transition-all hover:shadow-lg hover:dark:brightness-[1.1] w-full relative min-w-0"
                  onclick={() => openSpace(url)}>
                  <div class="flex w-full items-start gap-2">
                    <div
                      class="mt-4 flex cursor-grab p-1 text-base-content/30 transition-colors group-hover:text-base-content/60">
                      <Icon icon={DragHandle} />
                    </div>
                    <RelaySummary hideFavorites {url} />
                  </div>
                  {#if $notifications.has(makeSpacePath(url))}
                    <div class="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"></div>
                  {/if}
                </Button>
              </div>
            {/each}
          {:else if !term}
            <p class="py-12 text-center">You haven't joined any spaces yet.</p>
          {/if}
          <Divider>{filteredUserUrls.length > 0 ? "More Spaces" : "Browse Spaces"}</Divider>
          {#each otherSpaces.slice(0, limit) as relay (relay.url)}
            <Button
              class="card2 bg-alt shadow-md transition-all hover:shadow-lg hover:dark:brightness-[1.1]"
              onclick={() => openSpace(relay.url)}>
              <RelaySummary url={relay.url} />
            </Button>
          {/each}
          <div class="flex justify-center py-20">
            {#await sleep(5000)}
              <Spinner loading>Looking for spaces...</Spinner>
            {:then}
              {#if otherSpaces.length === 0}
                <Spinner>No other spaces found.</Spinner>
              {/if}
            {/await}
          </div>
        {/await}
      {/each}
    </div>
  </PageContent>
</Page>
