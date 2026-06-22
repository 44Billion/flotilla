<script lang="ts">
  import {ManagementMethod} from "@welshman/util"
  import {displayProfileByPubkey} from "@welshman/app"
  import {fly} from "@lib/transition"
  import MenuDots from "@assets/icons/menu-dots.svg?dataurl"
  import UserRounded from "@assets/icons/user-rounded.svg?dataurl"
  import Letter from "@assets/icons/letter-opened.svg?dataurl"
  import Pen from "@assets/icons/pen.svg?dataurl"
  import UserMinus from "@assets/icons/user-minus.svg?dataurl"
  import MinusCircle from "@assets/icons/minus-circle.svg?dataurl"
  import Button from "@lib/components/Button.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Popover from "@lib/components/Popover.svelte"
  import Confirm from "@lib/components/Confirm.svelte"
  import Profile from "@app/components/Profile.svelte"
  import ProfileInfo from "@app/components/ProfileInfo.svelte"
  import ProfileDetail from "@app/components/ProfileDetail.svelte"
  import SpaceMemberRoles from "@app/components/SpaceMemberRoles.svelte"
  import RoleBadge from "@app/components/RoleBadge.svelte"
  import {removeSpaceMembers, banSpaceMembers, type SpaceRole} from "@app/members"
  import {deriveSupportedMethods} from "@app/relays"
  import {pushModal} from "@app/modal"
  import {pushToast} from "@app/toast"
  import {goToChat} from "@app/routes"

  interface Props {
    url: string
    pubkey: string
    roles?: SpaceRole[]
  }

  const {url, pubkey, roles = []}: Props = $props()

  const supportedMethods = deriveSupportedMethods(url)
  const canUnallow = $derived($supportedMethods.includes(ManagementMethod.UnallowPubkey))
  const canBan = $derived($supportedMethods.includes(ManagementMethod.BanPubkey))
  const canAssign = $derived($supportedMethods.some(m => (m as string) === "assignrole"))
  const canUnassign = $derived($supportedMethods.some(m => (m as string) === "unassignrole"))

  let menuOpen = $state(false)

  const back = () => history.back()
  const closeMenu = () => (menuOpen = false)

  const openProfile = () => {
    menuOpen = false
    pushModal(ProfileDetail, {pubkey, url})
  }

  const sendMessage = () => {
    menuOpen = false
    goToChat([pubkey])
  }

  const editRoles = () => {
    menuOpen = false
    pushModal(SpaceMemberRoles, {url, pubkey})
  }

  const removeMember = () => {
    menuOpen = false
    pushModal(Confirm, {
      title: "Remove Member",
      message: `Remove @${displayProfileByPubkey(pubkey)} from the space?`,
      confirm: async () => {
        const error = await removeSpaceMembers(url, [pubkey])

        if (error) {
          pushToast({theme: "error", message: error})
        } else {
          pushToast({message: "Member has successfully been removed!"})
          back()
        }
      },
    })
  }

  const banMember = () => {
    menuOpen = false
    pushModal(Confirm, {
      title: "Ban Member",
      message: `Ban @${displayProfileByPubkey(pubkey)} from the space?`,
      confirm: async () => {
        const error = await banSpaceMembers(url, [pubkey])

        if (error) {
          pushToast({theme: "error", message: error})
        } else {
          pushToast({message: "Member has successfully been banned!"})
          back()
        }
      },
    })
  }
</script>

<div class="card2 card2-sm border border-solid border-base-content/20 relative">
  <button
    type="button"
    class="absolute inset-0 cursor-pointer rounded-box"
    aria-label="View {displayProfileByPubkey(pubkey)}'s profile"
    onclick={openProfile}>
  </button>
  <div class="pointer-events-none relative flex items-start justify-between gap-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <Profile {pubkey} {url} inert />
      {#if roles.length > 0}
        <div class="flex flex-wrap gap-1">
          {#each roles as role (role.id)}
            <RoleBadge {role} />
          {/each}
        </div>
      {/if}
      <div class="line-clamp-1 text-sm opacity-70">
        <ProfileInfo {pubkey} {url} singleLine />
      </div>
    </div>
    <div class="pointer-events-auto relative shrink-0">
      <Button class="btn btn-square btn-ghost btn-sm" onclick={() => (menuOpen = !menuOpen)}>
        <Icon icon={MenuDots} />
      </Button>
      {#if menuOpen}
        <Popover hideOnClick onClose={closeMenu}>
          <ul
            transition:fly
            class="menu absolute right-0 z-popover mt-2 w-52 gap-1 rounded-box bg-base-100 p-2 shadow-md">
            <li>
              <Button onclick={sendMessage}>
                <Icon icon={Letter} />
                Send message
              </Button>
            </li>
            {#if canAssign || canUnassign}
              <li>
                <Button onclick={editRoles}>
                  <Icon icon={Pen} />
                  Edit roles
                </Button>
              </li>
            {/if}
            {#if canUnallow}
              <li>
                <Button onclick={removeMember}>
                  <Icon icon={UserMinus} />
                  Remove member
                </Button>
              </li>
            {/if}
            {#if canBan}
              <li>
                <Button class="text-error" onclick={banMember}>
                  <Icon icon={MinusCircle} />
                  Ban member
                </Button>
              </li>
            {/if}
          </ul>
        </Popover>
      {/if}
    </div>
  </div>
</div>
