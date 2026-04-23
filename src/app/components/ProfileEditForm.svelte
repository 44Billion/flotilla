<script lang="ts">
  import type {Snippet} from "svelte"
  import type {Profile} from "@welshman/util"
  import {preventDefault} from "@lib/html"
  import UserCircle from "@assets/icons/user-circle.svg?dataurl"
  import MapPoint from "@assets/icons/map-point.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Field from "@lib/components/Field.svelte"
  import Button from "@lib/components/Button.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import InputProfilePicture from "@app/components/InputProfilePicture.svelte"
  import InfoHandle from "@app/components/InfoHandle.svelte"
  import {pushModal} from "@app/util/modal"

  type Values = {
    profile: Profile
  }

  type Props = {
    initialValues: Values
    onsubmit: (values: Values) => void
    isSignup?: boolean
    footer: Snippet
    progressBar?: Snippet
  }

  const {initialValues, isSignup, onsubmit, footer, progressBar}: Props = $props()

  const values = $state(initialValues)

  const submit = () => onsubmit($state.snapshot(values))

  let file: File | undefined = $state()
</script>

<Modal tag="form" onsubmit={preventDefault(submit)}>
  <ModalBody>
    {#if isSignup}
      <div class="grid grid-cols-2">
        <div class="flex flex-col gap-2">
          <p class="text-2xl">Create a Profile</p>
          <p class="text-sm">
            Give people something to go on — but remember, privacy matters! Be careful about sharing
            sensitive information.
          </p>
        </div>
        <div class="flex flex-col items-center justify-center gap-2">
          <InputProfilePicture bind:file bind:url={values.profile.picture} />
          <p class="text-xs">Upload an Avatar</p>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center py-4">
        <InputProfilePicture bind:file bind:url={values.profile.picture} />
      </div>
    {/if}
    <Field>
      {#snippet label()}
        <p>Nickname</p>
      {/snippet}
      {#snippet input()}
        <label class="input input-bordered flex w-full items-center gap-2">
          <Icon icon={UserCircle} />
          <input bind:value={values.profile.name} class="grow" type="text" />
        </label>
      {/snippet}
      {#snippet info()}
        What would you like people to call you?
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        <p>About You</p>
      {/snippet}
      {#snippet input()}
        <textarea
          class="textarea textarea-bordered leading-4 w-full"
          rows="5"
          bind:value={values.profile.about}></textarea>
      {/snippet}
      {#snippet info()}
        Give a brief introduction to why you're here.
      {/snippet}
    </Field>
    {#if !isSignup}
      <Field>
        {#snippet label()}
          <p>Nostr Address</p>
        {/snippet}
        {#snippet input()}
          <label class="input input-bordered flex w-full items-center gap-2">
            <Icon icon={MapPoint} />
            <input bind:value={values.profile.nip05} class="grow" type="text" />
          </label>
        {/snippet}
        {#snippet info()}
          <p>
            <Button class="link" onclick={() => pushModal(InfoHandle)}
              >What is a nostr address?</Button>
          </p>
        {/snippet}
      </Field>
    {/if}
  </ModalBody>
  {#if progressBar}
    {@render progressBar()}
  {/if}
  <ModalFooter>
    {@render footer()}
  </ModalFooter>
</Modal>
