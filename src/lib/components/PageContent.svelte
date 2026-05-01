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
      "scroll-container z-feature flex min-h-0 w-full min-w-0 flex-col overflow-y-auto overflow-x-hidden pb-14 md:pb-0",
    ),
  )
</script>

<div {...props} bind:this={element} data-component="PageContent" class={className}>
  {@render children?.()}
</div>
