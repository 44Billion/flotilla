<script lang="ts">
  import {getTagValue, ManagementMethod} from "@welshman/util"
  import type {TrustedEvent, PublishedRoomMeta} from "@welshman/util"
  import {repository, manageRelay} from "@welshman/app"
  import Button from "@lib/components/Button.svelte"
  import ProfileName from "@app/components/ProfileName.svelte"
  import ProfileDetail from "@app/components/ProfileDetail.svelte"
  import RoomName from "@app/components/RoomName.svelte"
  import {pushModal} from "@app/modal"
  import {pushToast} from "@app/toast"
  import {deriveRoom} from "@app/groups"
  import {addRoomMembers} from "@app/members"

  type Props = {
    url: string
    event: TrustedEvent
    onResolved?: () => void
  }

  const {url, event, onResolved}: Props = $props()

  const h = getTagValue("h", event.tags) || ""
  const room = deriveRoom(url, h)

  const showProfile = () => pushModal(ProfileDetail, {pubkey: event.pubkey, url})

  const dismiss = async () => {
    loading = true

    try {
      const {error} = await manageRelay(url, {
        method: ManagementMethod.BanEvent,
        params: [event.id, "Join request dismissed"],
      })

      if (error) {
        pushToast({theme: "error", message: error})
      } else {
        pushToast({message: "Join request has been dismissed."})
        repository.removeEvent(event.id)
        onResolved?.()
      }
    } finally {
      loading = false
    }
  }

  const accept = async () => {
    loading = true

    try {
      const error = await addRoomMembers(url, $room as PublishedRoomMeta, [event.pubkey])

      if (error) {
        pushToast({theme: "error", message: error})
      } else {
        pushToast({message: "Member has been added to the room!"})
        onResolved?.()
      }
    } finally {
      loading = false
    }
  }

  let loading = $state(false)
</script>

<div class="column gap-4 card2 card2-sm bg-alt">
  <div class="flex justify-between gap-2">
    <div>
      <Button class="inline text-primary" onclick={showProfile}>
        <ProfileName pubkey={event.pubkey} {url} />
      </Button>
      <span>
        requested membership in #<RoomName {url} {h} />
      </span>
    </div>
    <div class="flex gap-2">
      <Button class="btn btn-neutral btn-sm" onclick={dismiss} disabled={loading}>Dismiss</Button>
      <Button class="btn btn-primary btn-sm" onclick={accept} disabled={loading}>Accept</Button>
    </div>
  </div>
</div>
