<script lang="ts" module>
  export type ActionItem = {
    title: string
    subtitle: string
    action: string
    apply: () => unknown
  }
</script>

<script lang="ts">
  import Stars from "@assets/icons/stars.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"

  const {title, action, subtitle, apply}: ActionItem = $props()
</script>

<div class="card2 card2-sm bg-alt flex justify-between">
  <div class="flex flex-col gap-1">
    <strong>{title}</strong>
    <p class="text-sm">{subtitle}</p>
  </div>
  <Button class="btn btn-neutral btn-sm" onclick={apply}>
    <Icon icon={Stars} />
    {action}
  </Button>
</div>
