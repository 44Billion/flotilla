<script lang="ts">
  import {fly} from "@lib/transition"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import AddCircle from "@assets/icons/add-circle.svg?dataurl"
  import MenuDots from "@assets/icons/menu-dots.svg?dataurl"
  import Pen from "@assets/icons/pen.svg?dataurl"
  import TrashBin from "@assets/icons/trash-bin-2.svg?dataurl"
  import Button from "@lib/components/Button.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Popover from "@lib/components/Popover.svelte"
  import Confirm from "@lib/components/Confirm.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import RelayName from "@app/components/RelayName.svelte"
  import RoleCreate from "@app/components/RoleCreate.svelte"
  import RoleEdit from "@app/components/RoleEdit.svelte"
  import RoleAddMembers from "@app/components/RoleAddMembers.svelte"
  import RoleItem from "@app/components/RoleItem.svelte"
  import {deriveSpaceRoles, deleteRole, type SpaceRole} from "@app/members"
  import {pushModal} from "@app/modal"
  import {pushToast} from "@app/toast"

  interface Props {
    url: string
  }

  const {url}: Props = $props()

  const roles = deriveSpaceRoles(url)

  let menuRoleId = $state<string | undefined>()

  const back = () => history.back()

  const closeMenu = () => (menuRoleId = undefined)

  const createRole = () => pushModal(RoleCreate, {url})

  const editRole = (role: SpaceRole) => {
    menuRoleId = undefined
    pushModal(RoleEdit, {url, role})
  }

  const addMembers = (role: SpaceRole) => {
    menuRoleId = undefined
    pushModal(RoleAddMembers, {url, role})
  }

  const confirmDelete = (role: SpaceRole) => {
    menuRoleId = undefined
    pushModal(Confirm, {
      title: "Delete Role",
      message: `Delete the "${role.label}" role? Members will keep their space membership.`,
      confirm: async () => {
        const error = await deleteRole(url, role.id)

        if (error) {
          pushToast({theme: "error", message: error})
        } else {
          pushToast({message: "Role deleted!"})
          back()
        }
      },
    })
  }
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Manage Roles</ModalTitle>
      <ModalSubtitle>on <RelayName {url} class="text-primary" /></ModalSubtitle>
    </ModalHeader>
    {#if $roles.length === 0}
      <div class="card2 bg-base-200 p-4 text-sm opacity-70">
        No roles yet. Create one to start organizing members.
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each $roles as role (role.id)}
          <div class="card2 card2-sm bg-alt flex justify-between gap-2">
            <RoleItem {role} />
            <div class="relative shrink-0">
              <Button
                class="btn btn-square btn-ghost btn-sm"
                onclick={() => (menuRoleId = menuRoleId === role.id ? undefined : role.id)}>
                <Icon icon={MenuDots} />
              </Button>
              {#if menuRoleId === role.id}
                <Popover hideOnClick onClose={closeMenu}>
                  <ul
                    transition:fly
                    class="menu absolute right-0 z-popover mt-2 w-52 gap-1 rounded-box bg-base-100 p-2 shadow-md">
                    <li>
                      <Button onclick={() => addMembers(role)}>
                        <Icon icon={AddCircle} />
                        Add members
                      </Button>
                    </li>
                    <li>
                      <Button onclick={() => editRole(role)}>
                        <Icon icon={Pen} />
                        Edit role
                      </Button>
                    </li>
                    <li>
                      <Button class="text-error" onclick={() => confirmDelete(role)}>
                        <Icon icon={TrashBin} />
                        Delete role
                      </Button>
                    </li>
                  </ul>
                </Popover>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button class="btn btn-primary" onclick={createRole}>
      <Icon icon={AddCircle} />
      Create Role
    </Button>
  </ModalFooter>
</Modal>
