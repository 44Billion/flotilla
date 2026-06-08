<script lang="ts">
  import Stars from "@assets/icons/stars.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import type {HealthCheck} from "@app/healthChecks"
  import {applyHealthCheck} from "@app/healthChecks"

  type Props = {
    healthCheck: HealthCheck
  }

  const {healthCheck}: Props = $props()

  const apply = () => applyHealthCheck(healthCheck)
</script>

<div class="card2 card2-sm bg-alt flex justify-between">
  <div class="flex flex-col gap-1">
    <strong>{healthCheck.title}</strong>
    <p class="text-sm">{healthCheck.description}</p>
  </div>
  <Button class="btn btn-neutral btn-sm" onclick={apply}>
    <Icon icon={Stars} />
    {healthCheck.action}
  </Button>
</div>
