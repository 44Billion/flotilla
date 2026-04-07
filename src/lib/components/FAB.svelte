<script lang="ts">
  import type {Snippet} from "svelte"
  import cx from "classnames"
  import Button from "@lib/components/Button.svelte"

  const {
    onclick = () => {},
    className = "",
    children,
  }: {
    onclick?: () => void
    className?: string
    children?: Snippet
  } = $props()
</script>

<div class={cx("fixed bottom-20 right-4 z-nav hide-on-keyboard md:hidden", className)}>
  <Button
    class="btn btn-primary border-none shadow-xl hover:opacity-90 transition-all size-[50px] rounded-xl p-0"
    {onclick}>
    <div class="flex items-center justify-center">
      {@render children?.()}
    </div>
  </Button>
</div>
