<script lang="ts">
  import {
    getListTags,
    tagger,
    makeEvent,
    getPubkeyTagValues,
    getTagValues,
    MUTES,
    BLOSSOM_SERVERS,
  } from "@welshman/util"
  import {Router} from "@welshman/router"
  import {userMuteList, tagPubkey, publishThunk, userBlossomServerList} from "@welshman/app"
  import NotesMinimalistic from "@assets/icons/notes-minimalistic.svg?dataurl"
  import AddCircle from "@assets/icons/add-circle.svg?dataurl"
  import {preventDefault} from "@lib/html"
  import Field from "@lib/components/Field.svelte"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import InputList from "@lib/components/InputList.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import ProfileMultiSelect from "@app/components/ProfileMultiSelect.svelte"
  import {pushToast} from "@app/toast"
  import {PLATFORM_NAME} from "@app/env"
  import {userSettingsValues, publishSettings} from "@app/settings"

  const reset = () => {
    settings = {...$userSettingsValues}
    mutedPubkeys = getPubkeyTagValues(getListTags($userMuteList))
    blossomServers = getTagValues("server", getListTags($userBlossomServerList))
  }

  const addServer = () => {
    blossomServers = [...blossomServers, ""]
  }

  const onsubmit = preventDefault(async () => {
    await publishSettings($state.snapshot(settings))

    publishThunk({
      event: makeEvent(MUTES, {tags: mutedPubkeys.map(tagPubkey)}),
      relays: Router.get().FromUser().getUrls(),
    })

    publishThunk({
      event: makeEvent(BLOSSOM_SERVERS, {tags: blossomServers.map(tagger("server"))}),
      relays: Router.get().FromUser().getUrls(),
    })

    pushToast({message: "Your settings have been saved!"})
  })

  let settings = $state({...$userSettingsValues})
  let mutedPubkeys = $state(getPubkeyTagValues(getListTags($userMuteList)))
  let blossomServers = $state(getTagValues("server", getListTags($userBlossomServerList)))
</script>

<form class="content column gap-4" {onsubmit}>
  <div class="card2 bg-alt col-4 shadow-md">
    <strong class="flex items-center gap-3 text-lg">
      <Icon icon={NotesMinimalistic} />
      Content Settings
    </strong>
    <FieldInline>
      {#snippet label()}
        <p>Hide sensitive content?</p>
      {/snippet}
      {#snippet input()}
        <input
          type="checkbox"
          class="toggle toggle-primary"
          bind:checked={settings.hide_sensitive} />
      {/snippet}
      {#snippet info()}
        <p>
          If content is marked by the author as sensitive, {PLATFORM_NAME} will hide it by default.
        </p>
      {/snippet}
    </FieldInline>
    <FieldInline>
      {#snippet label()}
        <p>Show media?</p>
      {/snippet}
      {#snippet input()}
        <input type="checkbox" class="toggle toggle-primary" bind:checked={settings.show_media} />
      {/snippet}
      {#snippet info()}
        <p>Use this to disable link previews and image rendering.</p>
      {/snippet}
    </FieldInline>
    <Field>
      {#snippet label()}
        <p>Muted Accounts</p>
      {/snippet}
      {#snippet input()}
        <div>
          <ProfileMultiSelect bind:value={mutedPubkeys} />
        </div>
      {/snippet}
    </Field>
  </div>
  <div class="card2 bg-alt col-4 shadow-md">
    <strong class="text-lg">Accessibility</strong>
    <Field>
      {#snippet label()}
        <p>Font size</p>
      {/snippet}
      {#snippet secondary()}
        <p>{Math.round(settings.font_size * 100)}%</p>
      {/snippet}
      {#snippet input()}
        <input
          class="range range-primary w-full"
          type="range"
          min="0.8"
          max="1.3"
          step="0.05"
          bind:value={settings.font_size} />
      {/snippet}
    </Field>
  </div>
  <div class="card2 bg-alt col-4 shadow-md">
    <strong class="text-lg">Editor Settings</strong>
    <Field>
      {#snippet label()}
        <p>Send Delay</p>
      {/snippet}
      {#snippet input()}
        <input
          class="range range-primary w-full"
          type="range"
          min="0"
          max="10000"
          step="1000"
          bind:value={settings.send_delay} />
      {/snippet}
      {#snippet info()}
        <p>
          Delay sending chat messages for {settings.send_delay / 1000}
          {settings.send_delay === 1000 ? "second" : "seconds"}.
        </p>
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        <p>Media Server</p>
      {/snippet}
      {#snippet secondary()}
        <Button class="link text-sm underline flex items-center gap-1" onclick={addServer}>
          <Icon icon={AddCircle} size={4} />
          Add Server
        </Button>
      {/snippet}
      {#snippet input()}
        <InputList allowAdd={false} bind:value={blossomServers} />
      {/snippet}
      {#snippet info()}
        <p>Choose a media server type and url for files you upload to {PLATFORM_NAME}.</p>
      {/snippet}
    </Field>
  </div>
  <div
    class="card2 bg-alt sticky -bottom-3 shadow-md flex flex-row items-center justify-between gap-4">
    <Button class="btn btn-neutral" onclick={reset}>Discard Changes</Button>
    <Button type="submit" class="btn btn-primary">Save Changes</Button>
  </div>
</form>
