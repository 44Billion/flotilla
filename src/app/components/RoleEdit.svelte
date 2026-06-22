<script lang="ts">
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import RelayName from "@app/components/RelayName.svelte"
  import RoleForm, {type Values} from "@app/components/RoleForm.svelte"
  import {editRole, type SpaceRole} from "@app/members"
  import {pushToast} from "@app/toast"

  type Props = {
    url: string
    role: SpaceRole
  }

  const {url, role}: Props = $props()

  const back = () => history.back()

  let loading = $state(false)

  const onSubmit = async ({label, description, color}: Values) => {
    loading = true

    try {
      const error = await editRole(url, role.id, label, description, color, role.order)

      if (error) {
        pushToast({theme: "error", message: error})
      } else {
        pushToast({message: "Role updated!"})
        back()
      }
    } finally {
      loading = false
    }
  }
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Edit Role</ModalTitle>
      <ModalSubtitle>in <RelayName {url} class="text-primary" /></ModalSubtitle>
    </ModalHeader>
    <RoleForm {loading} {onSubmit} initialValues={role} />
  </ModalBody>
</Modal>
