<script lang="ts">
  import type {Component} from "svelte"
  import cx from "classnames"
  import {noop} from "@welshman/lib"
  import {fade, fly} from "@lib/transition"
  import Close from "@assets/icons/close.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"

  type Props = {
    onClose?: any
    noEscape?: boolean
    fullscreen?: boolean
    children: {
      component: Component<any>
      props: Record<string, any>
    }
  }

  const {onClose = noop, noEscape = false, fullscreen = false, children}: Props = $props()

  const wrapperClass = $derived(
    cx("absolute inset-0 flex sm:relative pointer-events-none", {
      "items-center justify-center": fullscreen,
      "items-end sm:w-[520px] sm:items-center": !fullscreen,
    }),
  )

  const innerClass = $derived(
    cx(
      "relative text-base-content text-base-content grow pointer-events-auto",
      "rounded-t-box sm:rounded-box",
      {
        "bg-alt shadow-m max-h-[90vh] flex flex-col max-w-full pb-sai sm:pb-0": !fullscreen,
      },
    ),
  )

  const buttonClass = $derived(
    cx("absolute right-3 btn btn-circle btn-neutral btn-sm", {
      "top-3": fullscreen,
      "-top-4": !fullscreen,
    }),
  )
</script>

<div class="center fixed inset-0 z-modal">
  <button
    type="button"
    aria-label="Close dialog"
    class="absolute inset-0 cursor-pointer bg-black opacity-50 dark:opacity-75"
    transition:fade={{duration: 200}}
    onclick={onClose}>
  </button>
  <div class={wrapperClass}>
    <div class={innerClass} transition:fly>
      {#if !noEscape}
        <Button class={buttonClass} onclick={onClose}>
          <Icon icon={Close} size={6} />
        </Button>
      {/if}
      <children.component {...children.props} />
    </div>
  </div>
</div>
