<script lang="ts">
  interface Props {
    children?: import("svelte").Snippet
    [key: string]: any
  }

  const {...props}: Props = $props()
</script>

<div class="flex flex-col gap-3 px-2 py-2 {props.class}">
  {@render props.children?.()}
</div>
