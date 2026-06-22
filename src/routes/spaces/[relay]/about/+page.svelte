<script lang="ts">
  import {tick} from "svelte"
  import {derived} from "svelte/store"
  import {page} from "$app/stores"
  import {displayRelayUrl} from "@welshman/util"
  import {displayProfileByPubkey, deriveRelay} from "@welshman/app"
  import Pen from "@assets/icons/pen.svg?dataurl"
  import UsersGroup from "@assets/icons/users-group-rounded.svg?dataurl"
  import BillList from "@assets/icons/bill-list.svg?dataurl"
  import AddCircle from "@assets/icons/add-circle.svg?dataurl"
  import MenuDots from "@assets/icons/menu-dots.svg?dataurl"
  import MinusCircle from "@assets/icons/minus-circle.svg?dataurl"
  import Magnifier from "@assets/icons/magnifier.svg?dataurl"
  import CloseCircle from "@assets/icons/close-circle.svg?dataurl"
  import {fly} from "@lib/transition"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import Button from "@lib/components/Button.svelte"
  import Popover from "@lib/components/Popover.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
  import ContentSearch from "@lib/components/ContentSearch.svelte"
  import RelayName from "@app/components/RelayName.svelte"
  import SpaceBar from "@app/components/SpaceBar.svelte"
  import SpaceDetails from "@app/components/SpaceDetails.svelte"
  import SpaceMember from "@app/components/SpaceMember.svelte"
  import SpaceInvite from "@app/components/SpaceInvite.svelte"
  import SpaceRoles from "@app/components/SpaceRoles.svelte"
  import SpaceMembersBanned from "@app/components/SpaceMembersBanned.svelte"
  import {
    deriveSpaceRoles,
    deriveSpaceMembers,
    deriveSpaceMemberRoles,
    deriveUserIsSpaceAdmin,
    type SpaceRole,
  } from "@app/members"
  import {decodeRelay} from "@app/relays"
  import {pushModal} from "@app/modal"

  const url = decodeRelay($page.params.relay!)
  const relay = deriveRelay(url)
  const roles = deriveSpaceRoles(url)
  const owner = $derived($relay?.pubkey)
  const members = deriveSpaceMembers(url)
  const memberRoles = deriveSpaceMemberRoles(url)
  const userIsAdmin = deriveUserIsSpaceAdmin(url)

  // Each member with their resolved roles (sorted by order).
  const memberList = derived([members, memberRoles, roles], ([$members, $memberRoles, $roles]) => {
    const byId = new Map($roles.map(role => [role.id, role]))

    return $members.map(pubkey => ({
      pubkey,
      roleList: ($memberRoles.get(pubkey) ?? [])
        .map(id => byId.get(id))
        .filter((role): role is SpaceRole => Boolean(role)),
    }))
  })

  let menuOpen = $state(false)

  const inviteMembers = () => {
    menuOpen = false
    pushModal(SpaceInvite, {url})
  }

  const manageRoles = () => {
    menuOpen = false
    pushModal(SpaceRoles, {url})
  }

  const bannedMembers = () => {
    menuOpen = false
    pushModal(SpaceMembersBanned, {url})
  }

  // In-place search: filter member cards by member info, and keep role sections
  // whose name matches the term even when their members don't.
  let term = $state("")

  const matchesTerm = (pubkey: string, t: string) =>
    displayProfileByPubkey(pubkey).toLowerCase().includes(t) || pubkey.toLowerCase().includes(t)

  // In-place search: match by member info or by the name of any role they hold.
  const visibleMembers = $derived.by(() => {
    const t = term.trim().toLowerCase()

    if (!t) return $memberList

    return $memberList.filter(
      ({pubkey, roleList}) =>
        matchesTerm(pubkey, t) || roleList.some(role => role.label.toLowerCase().includes(t)),
    )
  })

  const clearSearch = () => {
    term = ""
  }
</script>

<PageContent class="flex flex-col gap-4 p-4">
  <SpaceDetails {url} />
  <div class="card2 bg-alt flex flex-col gap-4">
    <div class="flex justify-between">
      <h3 class="flex items-center gap-2 text-lg font-semibold">
        <Icon icon={UsersGroup} />
        Members
      </h3>
      <div class="flex gap-2">
        <button class="btn btn-primary btn-sm" onclick={inviteMembers}>
          <Icon icon={AddCircle} />
          Invite people
        </button>
        {#if $userIsAdmin}
          <div class="relative">
            <button
              class="btn btn-neutral btn-sm btn-square"
              aria-label="More options"
              onclick={() => (menuOpen = !menuOpen)}>
              <Icon size={4} icon={MenuDots} />
            </button>
            {#if menuOpen}
              <Popover hideOnClick onClose={() => (menuOpen = false)}>
                <ul
                  transition:fly
                  class="menu absolute right-0 z-popover mt-2 w-48 gap-1 rounded-box bg-base-100 p-2 shadow-md">
                  <li>
                    <Button onclick={manageRoles}>
                      <Icon icon={UsersGroup} />
                      Manage Roles
                    </Button>
                  </li>
                  <li>
                    <Button onclick={bannedMembers}>
                      <Icon icon={MinusCircle} />
                      Banned Members
                    </Button>
                  </li>
                </ul>
              </Popover>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <label class="input input-sm input-bordered flex w-full items-center gap-2">
      <Icon size={4} icon={Magnifier} />
      <input
        bind:value={term}
        class="min-w-0 grow"
        type="text"
        placeholder="Search people or roles..." />
    </label>
    {#if visibleMembers.length === 0}
      <p class="flex flex-col items-center py-20 text-center">No members found.</p>
    {:else}
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {#each visibleMembers as { pubkey, roleList } (pubkey)}
          <SpaceMember {url} {pubkey} roles={roleList} />
        {/each}
      </div>
    {/if}
  </div>
</PageContent>
