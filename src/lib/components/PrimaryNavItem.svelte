<script lang="ts">
  import cx from "classnames"
  import {page} from "$app/stores"
  import Button from "@lib/components/Button.svelte"

  const {
    children,
    onclick = undefined,
    title = "",
    href = "",
    prefix = "",
    notification = false,
    ...restProps
  } = $props()

  const active = $derived($page.url?.pathname?.startsWith(prefix || href || "bogus"))

  const wrapperClass = $derived(
    cx("relative h-14 w-14 p-1", {
      "tooltip tooltip-right": title,
    }),
  )

  const innerClass = $derived(
    cx(
      "flex h-full w-full cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-base-300",
      restProps.class,
      {"bg-base-300 border border-solid border-base-content/20": active},
    ),
  )
</script>

<div class={wrapperClass} data-tip={title}>
  {#if onclick}
    <Button {onclick} class={innerClass}>
      {@render children?.()}
      {#if !active && notification}
        <div class="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"></div>
      {/if}
    </Button>
  {:else}
    <a {href} class={innerClass}>
      {@render children?.()}
      {#if !active && notification}
        <div class="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"></div>
      {/if}
    </a>
  {/if}
</div>
