<script lang="ts">
  import cx from "classnames"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import AltArrowRight from "@assets/icons/alt-arrow-right.svg?dataurl"
  import DoubleAltArrowLeft from "@assets/icons/double-alt-arrow-left.svg?dataurl"
  import DoubleAltArrowRight from "@assets/icons/double-alt-arrow-right.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"

  type Props = {
    page: number
    pageCount: number
    onPage: (page: number) => void
  }

  const {page, pageCount, onPage}: Props = $props()

  const goFirst = () => onPage(1)
  const goPrev = () => onPage(page - 1)
  const goNext = () => onPage(page + 1)
  const goLast = () => onPage(pageCount)
  const goToPage = (target: number) => onPage(target)

  const pages = $derived.by(() => {
    if (pageCount <= 7) {
      return Array.from({length: pageCount}, (_, i) => i + 1)
    }

    const result = new Set<number>([1, pageCount, page])

    if (page > 2) result.add(page - 1)
    if (page < pageCount - 1) result.add(page + 1)
    if (page > 3) result.add(page - 2)
    if (page < pageCount - 2) result.add(page + 2)

    return Array.from(result).sort((a, b) => a - b)
  })
</script>

<div class="flex flex-col items-center gap-3 border-t border-base-content/10 py-4">
  <p class="text-sm opacity-75">Page {page} of {pageCount}</p>
  <div class="join">
    <Button class="btn join-item btn-sm" disabled={page <= 1} onclick={goFirst}>
      <Icon icon={DoubleAltArrowLeft} size={4} />
    </Button>
    <Button class="btn join-item btn-sm" disabled={page <= 1} onclick={goPrev}>
      <Icon icon={AltArrowLeft} size={4} />
    </Button>
    {#each pages as p, i (p)}
      {#if i > 0 && p - pages[i - 1] > 1}
        <Button class="btn join-item btn-sm btn-disabled" disabled>…</Button>
      {/if}
      <Button
        class={cx("btn join-item btn-sm", page === p && "btn-primary")}
        onclick={() => goToPage(p)}>
        {p}
      </Button>
    {/each}
    <Button class="btn join-item btn-sm" disabled={page >= pageCount} onclick={goNext}>
      <Icon icon={AltArrowRight} size={4} />
    </Button>
    <Button class="btn join-item btn-sm" disabled={page >= pageCount} onclick={goLast}>
      <Icon icon={DoubleAltArrowRight} size={4} />
    </Button>
  </div>
</div>
