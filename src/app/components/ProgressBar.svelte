<script lang="ts">
  const {current, total}: {current: number; total: number} = $props()
</script>

<div class="flex w-full">
  {#each Array(total) as _, i}
    <div class="h-1 flex-1 transition-colors {i < current ? 'bg-primary' : 'bg-base-300'}"></div>
  {/each}
</div>
