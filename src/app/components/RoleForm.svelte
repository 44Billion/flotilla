<script module lang="ts">
  import type {SpaceRole} from "@app/members"

  export type Values = Pick<SpaceRole, "label" | "description" | "color">
</script>

<script lang="ts">
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import Field from "@lib/components/Field.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import {roleColor} from "@app/members"

  type Props = {
    initialValues?: Partial<Values>
    loading?: boolean
    onSubmit: (values: Values) => void
  }

  const {initialValues = {}, loading = false, onSubmit}: Props = $props()

  const values: Values = $state({
    label: "",
    description: "",
    color: Math.floor(Math.random() * 256),
    ...initialValues,
  })

  const back = () => history.back()

  const submit = () => onSubmit(values)
</script>

<div class="flex flex-col gap-4">
  <Field>
    {#snippet label()}
      <p>Name</p>
    {/snippet}
    {#snippet input()}
      <input
        bind:value={values.label}
        class="input input-bordered w-full"
        placeholder="Moderator" />
    {/snippet}
  </Field>
  <Field>
    {#snippet label()}
      <p>Description</p>
    {/snippet}
    {#snippet input()}
      <textarea bind:value={values.description} class="textarea textarea-bordered w-full" rows="2"
      ></textarea>
    {/snippet}
  </Field>
  <Field>
    {#snippet label()}
      <p>Color</p>
    {/snippet}
    {#snippet input()}
      <div class="flex items-center gap-3">
        <div
          class="h-8 w-8 shrink-0 rounded-full border-2 border-base-300"
          style="background-color: {roleColor(values.color)}">
        </div>
        <input
          type="range"
          min="0"
          max="255"
          bind:value={values.color}
          class="range range-sm grow"
          style="color: {roleColor(values.color)}; --range-shdw: {roleColor(values.color)}" />
      </div>
    {/snippet}
  </Field>
</div>
<ModalFooter>
  <Button class="btn btn-link" onclick={back}>
    <Icon icon={AltArrowLeft} />
    Go back
  </Button>
  <Button class="btn btn-primary" onclick={submit} disabled={loading || !values.label}>
    <Spinner {loading}>Save changes</Spinner>
  </Button>
</ModalFooter>
