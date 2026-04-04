<script lang="ts">
  interface Props {
    children?: import("svelte").Snippet
    [key: string]: any
  }

  const {...props}: Props = $props()
</script>

<div
  data-component="Page"
  class="relative flex-grow flex flex-col min-w-0 ml-sai mb-sai mt-sai mr-sai bg-base-200 md:ml-0 md:mb-0 {props.class}">
  {@render props.children?.()}
</div>
