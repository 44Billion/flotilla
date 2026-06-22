<script lang="ts">
  import {tick, onMount} from "svelte"
  import {page} from "$app/stores"
  import {debounce} from "throttle-debounce"
  import {formatTimestampAsDate, groupBy, now, MINUTE, HOUR, DAY, WEEK, uniqBy} from "@welshman/lib"
  import {request} from "@welshman/net"
  import {MESSAGE, getTagValue, sortEventsDesc} from "@welshman/util"
  import type {TrustedEvent} from "@welshman/util"
  import History from "@assets/icons/history.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import {createScroller} from "@lib/html"
  import {fly} from "@lib/transition"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import RecentItem from "@app/components/RecentItem.svelte"
  import {decodeRelay} from "@app/relays"
  import {CONTENT_KINDS} from "@app/content"
  import {deriveRecentActivity} from "@app/recent"
  import {goToEvent} from "@app/routes"

  const url = decodeRelay($page.params.relay!)

  const recentActivity = deriveRecentActivity(url)

  let term = $state("")
  let showSearch = $state(false)
  let loading = $state(false)
  let searchResults: TrustedEvent[] = $state([])
  let searchInput: HTMLInputElement | undefined = $state()
  let controller: AbortController | undefined

  let limit = $state(20)
  let element: Element | undefined = $state()

  const resultsByAge = $derived(groupBy(e => getAgeSection(e.created_at), searchResults))

  const getAgeSection = (createdAt: number) => {
    const age = now() - createdAt

    if (age <= DAY) return "day"
    if (age <= WEEK) return "week"
    return "older"
  }

  const getAgeLabel = (createdAt: number) => {
    const age = now() - createdAt

    if (age < MINUTE) return "Just now"
    if (age < HOUR) return `${Math.floor(age / MINUTE)}m ago`
    if (age < DAY) return `${Math.floor(age / HOUR)}h ago`
    return `${Math.floor(age / DAY)}d ago`
  }

  const openSearch = () => {
    showSearch = true
    tick().then(() => searchInput?.focus())
  }

  const closeSearch = () => {
    showSearch = false
  }

  const clearSearch = () => {
    term = ""
    showSearch = false
    loading = false
    searchResults = []
    controller?.abort()
    controller = undefined
  }

  const search = debounce(300, async (searchTerm: string) => {
    controller?.abort()

    if (!searchTerm.trim()) {
      loading = false
      searchResults = []
      return
    }

    controller = new AbortController()
    loading = true

    try {
      const events = await request({
        relays: [url],
        autoClose: true,
        signal: controller.signal,
        filters: [{kinds: [MESSAGE, ...CONTENT_KINDS], search: searchTerm.trim()}],
      })

      searchResults = sortEventsDesc(uniqBy((e: TrustedEvent) => e.id, events))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        searchResults = []
      }
    } finally {
      loading = false
    }
  })

  const onInput = () => {
    showSearch = true
    void search(term)
  }

  const onResultClick = (event: TrustedEvent) => {
    closeSearch()
    goToEvent(event, {keepFocus: true})
  }

  onMount(() => {
    const scroller = createScroller({
      element: element!,
      onScroll: () => {
        limit += 10
      },
    })

    return () => scroller.stop()
  })
</script>

<SpaceBar>
  {#snippet leading()}
    <Icon icon={History} />
  {/snippet}
  {#snippet title()}
    <strong>Recent Activity</strong>
  {/snippet}
  {#snippet action()}
    <button class="btn btn-neutral btn-sm btn-square" aria-label="Search" onclick={openSearch}>
      <Icon size={4} icon={Magnifier} />
    </button>
    {#if showSearch}
      <button class="fixed inset-0 z-feature" aria-label="Close search" onclick={closeSearch}
      ></button>
      <div class="fixed top-sai right-sai left-content z-feature p-2">
        <div
          class="card2 card2-sm bg-alt flex flex-col gap-2 shadow-md"
          transition:fly={{y: -40, duration: 150}}>
          <div class="flex justify-between">
            <strong>Search</strong>
            <Button onclick={clearSearch}>
              <Icon icon={CloseCircle} />
            </Button>
          </div>
          <label class="input input-sm input-bordered flex w-full items-center gap-2">
            <Icon size={4} icon={Magnifier} />
            <input
              bind:this={searchInput}
              bind:value={term}
              class="min-w-0 grow"
              type="text"
              placeholder="Search this space..."
              oninput={onInput} />
          </label>
          <div class="max-h-[65vh] overflow-y-auto">
            {#if !term}
              <p class="text-sm opacity-70">Search for content across this space.</p>
            {:else if loading}
              <p class="text-sm opacity-70">Searching...</p>
            {:else if resultsByAge.size === 0}
              <p class="text-sm opacity-70">No results found.</p>
            {:else}
              <div class="col-2">
                {#each resultsByAge as [key, events] (key)}
                  <div class="col-2">
                    <p class="text-xs uppercase tracking-wide opacity-60">
                      {#if key === "day"}
                        Last 24 Hours
                      {:else if key === "week"}
                        Last 7 Days
                      {:else}
                        Older
                      {/if}
                    </p>
                    <div class="col-2">
                      {#each events as event (event.id)}
                        <button
                          class="card2 bg-alt card2-sm col-2 transition-colors hover:bg-base-200 text-left"
                          onclick={() => onResultClick(event)}>
                          <p class="line-clamp-2 text-sm">
                            {event.content.trim() ||
                              getTagValue("title", event.tags) ||
                              "(No text content)"}
                          </p>
                          <div class="row-2 text-xs opacity-70">
                            <span>{getAgeLabel(event.created_at)}</span>
                            <span>{formatTimestampAsDate(event.created_at)}</span>
                          </div>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/snippet}
</SpaceBar>

<PageContent class="flex flex-col gap-2 p-2 sm:gap-4 sm:p-4" bind:element>
  {#if $recentActivity.length === 0}
    <p class="flex flex-col items-center py-20 text-center">No recent activity found!</p>
  {:else}
    {#each $recentActivity.slice(0, limit) as item (item.event.id)}
      <RecentItem {url} {item} />
    {/each}
  {/if}
</PageContent>
