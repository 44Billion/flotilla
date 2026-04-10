<script lang="ts">
  import type {Snippet} from "svelte"

  let {
    children,
    root,
    initiallyVisible = false,
    estimatedHeight = 48,
  }: {
    children: Snippet
    root?: HTMLElement
    initiallyVisible?: boolean
    estimatedHeight?: number
  } = $props()

  let visible = $state(initiallyVisible)
  let height = $state(estimatedHeight)
  let el: HTMLElement | undefined = $state()
  let hasMeasured = false

  $effect(() => {
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true
        } else {
          // Measure actual height before hiding content
          if (el) {
            const h = el.offsetHeight
            if (h > 0) {
              height = h
              hasMeasured = true
            }
          }
          if (hasMeasured) {
            visible = false
          }
        }
      },
      {root: root || null, rootMargin: "1000px 0px"},
    )

    observer.observe(el)
    return () => observer.disconnect()
  })
</script>

<div bind:this={el}>
  {#if visible}
    {@render children()}
  {:else}
    <div style:height="{height}px"></div>
  {/if}
</div>
