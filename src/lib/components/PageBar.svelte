<script lang="ts">
  import type {Snippet} from "svelte"

  interface Props {
    children?: Snippet
    class?: string
  }

  const {children, ...props}: Props = $props()
</script>

<div data-component="PageBar" class="cw top-sai fixed z-nav p-2 {props.class}">
  <div class="rounded-xl bg-base-100 p-4 shadow-md h-20 md:h-12 flex flex-col justify-center">
    {@render children?.()}
  </div>
</div>
