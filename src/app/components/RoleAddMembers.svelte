<script lang="ts">
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import Field from "@lib/components/Field.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import ProfileMultiSelect from "@app/components/ProfileMultiSelect.svelte"
  import {addSpaceMembers, assignRole, type SpaceRole} from "@app/members"
  import {pushToast} from "@app/toast"

  interface Props {
    url: string
    role: SpaceRole
  }

  const {url, role}: Props = $props()

  const back = () => history.back()

  let loading = $state(false)
  let pubkeys: string[] = $state([])

  const submit = async () => {
    loading = true

    try {
      // Ensure they're space members first, then assign the role
      const memberError = await addSpaceMembers(url, pubkeys)

      if (memberError) {
        pushToast({theme: "error", message: memberError})
        return
      }

      for (const pubkey of pubkeys) {
        const error = await assignRole(url, pubkey, role.id)

        if (error) {
          pushToast({theme: "error", message: error})
          return
        }
      }

      pushToast({message: "Members assigned!"})
      back()
    } finally {
      loading = false
    }
  }
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Add to {role.label || "Role"}</ModalTitle>
      <ModalSubtitle>Assign members to this role</ModalSubtitle>
    </ModalHeader>
    <Field>
      {#snippet label()}
        <p>Search for People</p>
      {/snippet}
      {#snippet input()}
        <ProfileMultiSelect bind:value={pubkeys} />
      {/snippet}
    </Field>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button class="btn btn-primary" onclick={submit} disabled={loading || pubkeys.length === 0}>
      <Spinner {loading}>Save changes</Spinner>
    </Button>
  </ModalFooter>
</Modal>
