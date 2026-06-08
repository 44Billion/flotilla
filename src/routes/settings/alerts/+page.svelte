<script lang="ts">
  import cx from "classnames"
  import {sleep} from "@welshman/lib"
  import {Capacitor} from "@capacitor/core"
  import {Badge} from "@capawesome/capacitor-badge"
  import Bell from "@assets/icons/bell.svg?dataurl"
  import {preventDefault} from "@lib/html"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import {pushToast} from "@app/toast"
  import {clearBadges} from "@app/notifications"
  import {Push} from "@app/push"
  import {notificationSettings} from "@app/core/state"

  const reset = () => {
    settings = {...notificationSettings.get()}
  }

  const onsubmit = preventDefault(async () => {
    loading = true

    try {
      if (!settings.badge) {
        clearBadges()
      }

      let permission = "granted"

      if (settings.push) {
        permission = await Push.request()

        if (!permission.startsWith("granted")) {
          await sleep(300)

          settings.push = false

          return pushToast({
            theme: "error",
            message: `Failed to request notification permissions (${permission}).`,
          })
        }
      }

      notificationSettings.set(settings)

      pushToast({message: "Your settings have been saved!"})
    } finally {
      loading = false
    }
  })

  let loading = $state(false)
  let settings = $state({...notificationSettings.get()})
</script>

<form class="content column gap-4" {onsubmit}>
  <div class="card2 bg-alt col-4 shadow-md">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={Bell} />
      Alert Settings
    </strong>
    {#await Badge.isSupported()}
      <!-- pass -->
    {:then { isSupported }}
      {#if isSupported}
        <FieldInline>
          {#snippet label()}
            <p>Show badge for unread alerts</p>
          {/snippet}
          {#snippet input()}
            <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.badge} />
          {/snippet}
        </FieldInline>
      {/if}
    {/await}
    {#if !Capacitor.isNativePlatform()}
      <FieldInline>
        {#snippet label()}
          <p>Play sound for new activity</p>
        {/snippet}
        {#snippet input()}
          <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.sound} />
        {/snippet}
      </FieldInline>
    {/if}
    <FieldInline>
      {#snippet label()}
        <p>Enable push notifications</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.push} />
      {/snippet}
    </FieldInline>
  </div>
  <div
    class={cx("card2 bg-alt col-4 shadow-md", {
      "pointer-events-none opacity-50": !settings.badge && !settings.sound && !settings.push,
    })}>
    <strong class="text-lg">Alert Types</strong>
    <FieldInline>
      {#snippet label()}
        <p>Notify me about new activity</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.spaces} />
      {/snippet}
    </FieldInline>
    <FieldInline>
      {#snippet label()}
        <p>Always notify me when mentioned</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" checked={settings.mentions} />
      {/snippet}
    </FieldInline>
    <FieldInline>
      {#snippet label()}
        <p>Notify me about new messages</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.messages} />
      {/snippet}
    </FieldInline>
  </div>
  <div
    class="card2 bg-alt sticky -bottom-3 shadow-md flex flex-row items-center justify-between gap-4">
    <Button class="btn btn-neutral" onclick={reset} disabled={loading}>Discard Changes</Button>
    <Button type="submit" class="btn btn-primary" disabled={loading}>
      <Spinner {loading}>Save Changes</Spinner>
    </Button>
  </div>
</form>
