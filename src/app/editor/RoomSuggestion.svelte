<script lang="ts">
  import {displayRelayUrl} from "@welshman/util"
  import RoomNameWithImage from "@app/components/RoomNameWithImage.svelte"
  import {splitRoomId} from "@app/groups"

  type Props = {
    value: string
  }

  const {value}: Props = $props()
  const [url = "", h = ""] = splitRoomId(value)
</script>

<div class="max-w-full overflow-hidden text-ellipsis flex flex-col">
  <RoomNameWithImage {url} {h} />
  <span class="text-primary text-sm">{displayRelayUrl(url)}<span> </span></span>
</div>
