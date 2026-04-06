<style>
  a,
  button {
    padding: 12px 16px;
    display: flex;
    border-radius: var(--rounded-btn, 0.5rem);
    cursor: pointer;
    animation: nav-button-pop 200ms ease-out;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  a:active:hover,
  a:active:focus,
  button:active:hover,
  button:active:focus {
    animation: button-pop 0s ease-out;
    transform: scale(var(--btn-focus-scale, 0.97));
  }
</style>

<script lang="ts">
  import cx from "classnames"
  import {fade} from "@lib/transition"
  import {page} from "$app/stores"

  const {
    children,
    href = "",
    title = "",
    notification = false,
    replaceState = false,
    ...restProps
  } = $props()

  const active = $derived($page.url.pathname === href)
  const wrapperClass = $derived(
    cx(restProps.class, "relative flex flex-shrink-0 items-center gap-3 text-left transition-all", {
      "hover:bg-base-100 hover:text-base-content": true,
      "text-base-content bg-base-100": active,
      "tooltip tooltip-right": title,
    }),
  )
</script>

{#if href}
  <a
    {href}
    {...restProps}
    data-tip={title}
    data-sveltekit-replacestate={replaceState}
    class={wrapperClass}>
    {@render children?.()}
    {#if notification}
      <div class="absolute right-[1.15rem] top-5 h-2 w-2 rounded-full bg-primary" transition:fade>
      </div>
    {/if}
  </a>
{:else}
  <button {...restProps} data-tip={title} class={wrapperClass}>
    {#if notification}
      <div class="absolute right-[1.15rem] top-5 h-2 w-2 rounded-full bg-primary" transition:fade>
      </div>
    {/if}
    {@render children?.()}
  </button>
{/if}
