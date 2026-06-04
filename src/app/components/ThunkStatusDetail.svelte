<script lang="ts">
  import {stopPropagation} from "svelte/legacy"
  import type {AbstractThunk} from "@welshman/app"
  import {getFailedThunkUrls, getThunkUrlsWithStatus} from "@welshman/app"
  import {PublishStatus} from "@welshman/net"
  import {displayRelayUrl} from "@welshman/util"
  import CheckCircle from "@assets/icons/check-circle.svg?dataurl"
  import Danger from "@assets/icons/danger-triangle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import {addPeriod} from "@lib/util"

  interface Props {
    thunk: AbstractThunk
    retry: (url: string) => void
  }

  const {thunk, retry}: Props = $props()

  const successUrls = $derived(getThunkUrlsWithStatus(PublishStatus.Success, $thunk))
  const failedUrls = $derived(getFailedThunkUrls($thunk))
  const total = $derived(successUrls.length + failedUrls.length)
  const isPartial = $derived(successUrls.length > 0 && failedUrls.length > 0)

  const title = $derived(
    isPartial ? `Partial delivery ${successUrls.length}/${total} relays` : "Failed to send!",
  )

  const relayMessage = (status: PublishStatus | undefined, detail: string | undefined) => {
    if (detail) {
      return detail
    }

    if (status === PublishStatus.Timeout) {
      return "request timed out"
    }

    return "no details received"
  }
</script>

<div class="card2 bg-alt flex min-w-72 max-w-sm flex-col gap-3 px-4 py-3 shadow-lg">
  <span class="flex items-center gap-2 text-sm font-medium">
    <Icon icon={Danger} class="text-error" size={4} />
    {title}
  </span>
  <div class="divider my-0"></div>
  <div class="flex flex-col gap-3">
    {#each successUrls as url (url)}
      <div class="flex items-start gap-2 text-sm">
        <Icon icon={CheckCircle} class="mt-0.5 shrink-0 text-success" size={4} />
        <span>{displayRelayUrl(url)}</span>
      </div>
    {/each}
    {#each failedUrls as url (url)}
      {@const {detail, status} = $thunk.results[url] || {}}
      <div class="grid grid-cols-[1rem_1fr_auto] items-start gap-x-3 gap-y-1 text-sm">
        <Icon icon={Danger} class="mt-0.5 text-error" size={4} />
        <div class="min-w-0">
          <p class="break-all">{displayRelayUrl(url)}</p>
          <p class="text-xs opacity-60">{addPeriod(relayMessage(status, detail))}</p>
        </div>
        <Button class="link shrink-0 px-1" onclick={stopPropagation(() => retry(url))}>
          Retry
        </Button>
      </div>
    {/each}
  </div>
</div>
