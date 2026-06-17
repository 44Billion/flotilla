<script lang="ts">
  import {onMount} from "svelte"
  import * as nip19 from "nostr-tools/nip19"
  import {page} from "$app/stores"
  import {goto} from "$app/navigation"
  import {sleep} from "@welshman/lib"
  import type {MakeNonOptional} from "@welshman/lib"
  import type {TrustedEvent} from "@welshman/util"
  import {COMMENT, getTagValue} from "@welshman/util"
  import {repository} from "@welshman/app"
  import {request} from "@welshman/net"
  import {deriveEventsById, deriveEventsAsc} from "@welshman/store"
  import Reply from "@assets/icons/reply-2.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import Link from "@lib/components/Link.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import ThreadPost from "@app/components/ThreadPost.svelte"
  import ThreadPagination from "@app/components/ThreadPagination.svelte"
  import EventReply from "@app/components/EventReply.svelte"
  import RoomName from "@app/components/RoomName.svelte"
  import {deriveEvent} from "@app/repository"
  import {decodeRelay} from "@app/relays"
  import {makeSpacePath, scrollToEvent} from "@app/routes"

  const POSTS_PER_PAGE = 20

  const {relay, id} = $page.params as MakeNonOptional<typeof $page.params>
  const url = decodeRelay(relay)
  const event = deriveEvent(id, [url])
  const filters = [{kinds: [COMMENT], "#E": [id]}]
  const replies = deriveEventsAsc(deriveEventsById({filters, repository}))

  const back = () => history.back()

  const posts = $derived.by(() => {
    if (!$event) return []

    return [$event, ...$replies]
  })

  const replyCount = $derived(Math.max(0, posts.length - 1))
  const h = $derived(getTagValue("h", $event?.tags || []))

  const pageCount = $derived(Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE)))

  const currentPage = $derived.by(() => {
    const raw = parseInt($page.url.searchParams.get("page") || "1")

    if (Number.isNaN(raw) || raw < 1) return 1
    if (raw > pageCount) return pageCount

    return raw
  })

  const pagePosts = $derived(
    posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE),
  )

  const setPage = (nextPage: number) => {
    const params = new URLSearchParams($page.url.searchParams)

    if (nextPage <= 1) {
      params.delete("page")
    } else {
      params.set("page", String(nextPage))
    }

    const search = params.toString()

    goto(`${$page.url.pathname}${search ? `?${search}` : ""}`, {
      keepFocus: true,
      noScroll: true,
    })
  }

  const openReply = (post: TrustedEvent) => {
    replyTo = post
    showReply = true
  }

  const closeReply = () => {
    showReply = false
    replyTo = undefined
  }

  const openThreadReply = () => {
    if ($event) {
      openReply($event)
    }
  }

  const clearReplyParent = () => {
    if ($event) {
      replyTo = $event
    }
  }

  let showReply = $state(false)
  let replyTo: TrustedEvent | undefined = $state()
  let hashHandled = $state(false)

  $effect(() => {
    if (hashHandled || posts.length === 0) return

    const hash = window.location.hash.replace(/^#/, "")

    if (!hash.startsWith("nevent1")) return

    let eventId: string

    try {
      const decoded = nip19.decode(hash)

      if (decoded.type !== "nevent") return

      eventId = decoded.data.id
    } catch {
      return
    }

    const index = posts.findIndex(post => post.id === eventId)

    if (index < 0) return

    hashHandled = true

    const targetPage = Math.ceil((index + 1) / POSTS_PER_PAGE)

    if (targetPage !== currentPage) {
      setPage(targetPage)
    }

    setTimeout(() => scrollToEvent(posts[index]!.id), 100)
  })

  onMount(() => {
    const controller = new AbortController()

    request({relays: [url], filters, signal: controller.signal})

    return () => {
      controller.abort()
    }
  })
</script>

<SpaceBar {back} class="!h-auto min-h-20 py-3">
  {#snippet title()}
    <div class="flex min-w-0 flex-col gap-0.5">
      <h1 class="ellipsize text-base leading-none font-bold sm:text-xl">
        {getTagValue("title", $event?.tags || []) || ""}
      </h1>
      <p class="text-xs opacity-75">
        {replyCount}
        {replyCount === 1 ? "reply" : "replies"}
        {#if h}
          · <Link href={makeSpacePath(url, h)} class="link">#<RoomName {url} {h} /></Link>
        {/if}
      </p>
    </div>
  {/snippet}
</SpaceBar>

<PageContent class="flex flex-col">
  {#if $event}
    <div class="border-y border-base-content/15 bg-base-100">
      {#each pagePosts as post (post.id)}
        <ThreadPost {url} event={post} threadPubkey={$event.pubkey} onReply={openReply} />
      {/each}
    </div>
    {#if pageCount > 1}
      <ThreadPagination page={currentPage} {pageCount} onPage={setPage} />
    {/if}
    {#if showReply && replyTo && $event}
      <EventReply
        {url}
        event={$event}
        parent={replyTo.id === $event.id ? undefined : replyTo}
        onClose={closeReply}
        onClearParent={clearReplyParent}
        onSubmit={closeReply} />
    {:else}
      <div class="flex justify-end p-4">
        <Button class="btn btn-primary" onclick={openThreadReply}>
          <Icon icon={Reply} />
          Reply to thread
        </Button>
      </div>
    {/if}
  {:else}
    <div class="flex justify-center py-20">
      {#await sleep(5000)}
        <Spinner loading>Loading thread...</Spinner>
      {:then}
        <p>Failed to load thread.</p>
      {/await}
    </div>
  {/if}
</PageContent>
