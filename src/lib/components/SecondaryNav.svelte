<script lang="ts">
  import cx from "classnames"
  import type {Snippet} from "svelte"

  interface Props {
    class?: string
    children?: Snippet
  }

  const {children, ...props}: Props = $props()
</script>

<div
  class={cx(
    "ml-sai mt-sai mb-sai max-h-screen w-60 flex-shrink-0 flex-col gap-1 bg-base-300 z-nav hidden md:flex",
    props.class,
  )}>
  {@render children?.()}
</div>
