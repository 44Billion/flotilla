<script lang="ts">
  import cx from "classnames"
  import type {Snippet} from "svelte"

  interface Props {
    class?: string
    visible?: boolean
    children?: Snippet
  }

  const {children, visible = false, ...props}: Props = $props()
</script>

<div
  class={cx(
    "mt-sai mb-sai max-h-screen w-60 min-h-0 shrink-0 flex-col gap-1 bg-base-300 z-nav border-r border-solid border-base-content/5 dark:border-base-content/10",
    visible ? "flex" : "hidden md:flex",
    props.class,
  )}>
  {@render children?.()}
</div>
