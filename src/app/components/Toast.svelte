<script lang="ts">
  import {parse, renderAsHtml} from "@welshman/content"
  import Close from "@assets/icons/close.svg?dataurl"
  import {fly} from "@lib/transition"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import {toast, popToast} from "@app/util/toast"

  let touchStartY = 0
  let touchStartTime = 0
  let dragY = $state(0)
  let isSettling = $state(false)
  let containerEl = $state<HTMLDivElement | undefined>(undefined)

  $effect(() => {
    if ($toast) {
      dragY = 0
      isSettling = false
    }
  })

  $effect(() => {
    if (!containerEl) return
    containerEl.addEventListener("touchmove", onTouchMove, {passive: false})
    return () => containerEl!.removeEventListener("touchmove", onTouchMove)
  })

  const onActionClick = () => {
    $toast!.action!.onclick()
    popToast($toast!.id)
  }

  const onClose = () => popToast($toast!.id)

  const onTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY
    touchStartTime = Date.now()
    dragY = 0
    isSettling = false
  }

  const onTouchMove = (e: TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY
    if (delta < 0) {
      e.preventDefault()
      isSettling = false
      dragY = delta
    } else {
      dragY = 0
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY
    const duration = Date.now() - touchStartTime
    const isQuickFlick = duration < 400 && delta < 0
    const isSlowDismiss = delta < -40

    if (isQuickFlick || isSlowDismiss) {
      dragY = 0
      popToast($toast!.id)
    } else {
      isSettling = true
      dragY = 0
      setTimeout(() => {
        isSettling = false
      }, 200)
    }
  }
</script>

{#if $toast}
  {@const theme = $toast.theme || "info"}
  <div
    bind:this={containerEl}
    transition:fly={{y: -20}}
    class="fixed z-toast top-[calc(var(--sait)+0.5rem)] left-[calc(var(--sail)+0.5rem)] right-[calc(var(--sair)+0.5rem)] flex flex-col gap-2 md:right-4 md:bottom-4 md:top-auto md:left-auto md:w-80"
    style={dragY !== 0 || isSettling
      ? `transform: translateY(${dragY}px)${isSettling ? "; transition: transform 200ms ease-out" : ""}`
      : ""}
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}>
    {#key $toast.id}
      <div
        role="alert"
        class="alert relative flex justify-center whitespace-normal text-left"
        class:bg-base-100={theme === "info"}
        class:text-base-content={theme === "info"}
        class:alert-error={theme === "error"}>
        <Button
          class="absolute -top-2 -right-2 btn btn-circle btn-neutral btn-xs hidden md:inline-flex flex justify-center items-center"
          onclick={onClose}>
          <Icon icon={Close} size={4} />
        </Button>
        <p class="md:pr-6" class:welshman-content-error={theme === "error"}>
          {#if $toast.message}
            {@html renderAsHtml(parse({content: $toast.message}))}
            {#if $toast.action}
              <Button class="cursor-pointer underline" onclick={onActionClick}>
                {$toast.action.message}
              </Button>
            {/if}
          {:else if $toast.children}
            {@const {component: Component, props} = $toast?.children || {}}
            <Component toast={$toast} {...props} />
          {/if}
        </p>
      </div>
    {/key}
  </div>
{/if}
