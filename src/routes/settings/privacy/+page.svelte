<script lang="ts">
  import ShieldMinimalistic from "@assets/icons/shield-minimalistic.svg?dataurl"
  import {preventDefault} from "@lib/html"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import {pushToast} from "@app/toast"
  import {PLATFORM_NAME, RelayAuthMode, userSettingsValues} from "@app/core/state"
  import {publishSettings} from "@app/core/commands"

  const reset = () => {
    settings = {...$userSettingsValues}
  }

  const onAuthModeChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement

    settings.relay_auth = target.checked ? RelayAuthMode.Aggressive : RelayAuthMode.Conservative
  }

  const onsubmit = preventDefault(async () => {
    await publishSettings($state.snapshot(settings))

    pushToast({message: "Your settings have been saved!"})
  })

  let settings = $state({...$userSettingsValues})
</script>

<form class="content column gap-4" {onsubmit}>
  <div class="card2 bg-alt flex flex-col gap-4 shadow-md">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={ShieldMinimalistic} />
      Privacy Settings
    </strong>
    <FieldInline>
      {#snippet label()}
        <p>Authenticate with unknown relays?</p>
      {/snippet}
      {#snippet input()}
        <input
          type="checkbox"
          class="toggle toggle-primary"
          onchange={onAuthModeChange}
          checked={settings.relay_auth === RelayAuthMode.Aggressive} />
      {/snippet}
      {#snippet info()}
        <p>Controls whether {PLATFORM_NAME} will identify you to relays not in your lists.</p>
      {/snippet}
    </FieldInline>
    <FieldInline>
      {#snippet label()}
        <p>Report errors?</p>
      {/snippet}
      {#snippet input()}
        <input
          type="checkbox"
          class="toggle toggle-primary"
          bind:checked={settings.report_errors} />
      {/snippet}
      {#snippet info()}
        <p>Allow {PLATFORM_NAME} to send error reports to help improve the app.</p>
      {/snippet}
    </FieldInline>
    <FieldInline>
      {#snippet label()}
        <p>Report usage?</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.report_usage} />
      {/snippet}
      {#snippet info()}
        <p>Allow {PLATFORM_NAME} to collect anonymous usage data.</p>
      {/snippet}
    </FieldInline>
  </div>
  <div
    class="card2 bg-alt sticky -bottom-3 shadow-md flex flex-row items-center justify-between gap-4">
    <Button class="btn btn-neutral" onclick={reset}>Discard Changes</Button>
    <Button type="submit" class="btn btn-primary">Save Changes</Button>
  </div>
</form>
