<script lang="ts">
  import {get} from "svelte/store"
  import {displayProfileByPubkey} from "@welshman/app"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import RoleItem from "@app/components/RoleItem.svelte"
  import {deriveSpaceRoles, deriveSpaceMemberRoles, assignRole, unassignRole} from "@app/members"
  import {pushToast} from "@app/toast"

  interface Props {
    url: string
    pubkey: string
  }

  const {url, pubkey}: Props = $props()

  const roles = deriveSpaceRoles(url)
  const memberRoles = deriveSpaceMemberRoles(url)
  const initial = new Set(get(memberRoles).get(pubkey) ?? [])

  let selected = $state(new Set(initial))
  let loading = $state(false)

  const back = () => history.back()

  const toggle = (id: string) => {
    const next = new Set(selected)

    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    selected = next
  }

  const submit = async () => {
    loading = true

    try {
      for (const id of selected) {
        if (!initial.has(id)) {
          const error = await assignRole(url, pubkey, id)

          if (error) {
            pushToast({theme: "error", message: error})
            return
          }
        }
      }

      for (const id of initial) {
        if (!selected.has(id)) {
          const error = await unassignRole(url, pubkey, id)

          if (error) {
            pushToast({theme: "error", message: error})
            return
          }
        }
      }

      pushToast({message: "Roles updated!"})
      back()
    } finally {
      loading = false
    }
  }
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Edit Member</ModalTitle>
      <ModalSubtitle>
        Manage roles for <span class="text-primary">@{displayProfileByPubkey(pubkey)}</span>
      </ModalSubtitle>
    </ModalHeader>
    {#if $roles.length === 0}
      <div class="card2 bg-base-200 p-4 text-sm opacity-70">This space has no roles yet.</div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each $roles as role (role.id)}
          <label class="card2 card2-sm flex justify-between cursor-pointer gap-3">
            <RoleItem {role} />
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={selected.has(role.id)}
              onchange={() => toggle(role.id)} />
          </label>
        {/each}
      </div>
    {/if}
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button class="btn btn-primary" onclick={submit} disabled={loading}>
      <Spinner {loading}>Save changes</Spinner>
    </Button>
  </ModalFooter>
</Modal>
