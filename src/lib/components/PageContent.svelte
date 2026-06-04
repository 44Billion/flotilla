<script lang="ts">
  import cx from "classnames"
  import type {Snippet} from "svelte"

  interface Props {
    element?: Element
    children?: Snippet
    [key: string]: any
  }

  let {children, element = $bindable(), ...props}: Props = $props()

  const className = $derived(
    cx(
      props.class,
      "scroll-container z-feature flex flex-col min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden mb-14 md:mb-0",
    ),
  )
</script>

<div {...props} bind:this={element} data-component="PageContent" class={className}>
  {@render children?.()}
</div>
