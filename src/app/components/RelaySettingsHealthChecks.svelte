<script lang="ts">
  import Stars from "@assets/icons/stars.svg?dataurl"
  import CheckCircle from "@assets/icons/check-circle.svg?dataurl"
  import DangerTriangle from "@assets/icons/danger-triangle.svg?dataurl"
  import Stethoscope from "@assets/icons/stethoscope.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import RelaySettingsHealthCheck from "@app/components/RelaySettingsHealthCheck.svelte"
  import {PLATFORM_NAME} from "@app/env"
  import {pendingHealthChecks, applyHealthCheck} from "@app/healthChecks"

  const applyAll = () => {
    for (const healthCheck of $pendingHealthChecks) {
      applyHealthCheck(healthCheck)
    }
  }
</script>

<div class="card2 bg-alt flex flex-col gap-4 shadow-md">
  <div class="flex justify-between items-center">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={Stethoscope} />
      Health Check
    </strong>
    <span class="flex items-center gap-2 text-sm">
      <Icon icon={$pendingHealthChecks.length === 0 ? CheckCircle : DangerTriangle} />
      {$pendingHealthChecks.length} Issue{$pendingHealthChecks.length === 1 ? "" : "s"} Detected
    </span>
  </div>
  <p>
    {PLATFORM_NAME} actively checks your connection to the network in the background to discover relays
    that are offline, that you don't have access to, or are otherwise causing trouble.
  </p>
  {#each $pendingHealthChecks as healthCheck}
    <RelaySettingsHealthCheck {healthCheck} />
  {/each}
  {#if $pendingHealthChecks.length > 0}
    <Button class="btn btn-primary" onclick={applyAll}>
      <Icon icon={Stars} />
      Apply All Recommendations
    </Button>
  {/if}
</div>
