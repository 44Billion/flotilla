<script lang="ts">
  import type {Snippet} from "svelte"
  import {page} from "$app/stores"
  import {goto} from "$app/navigation"
  import {displayRelayUrl} from "@welshman/util"
  import ArrowLeft from "@assets/icons/arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageBar from "@lib/components/PageBar.svelte"
  import RelayIcon from "@app/components/RelayIcon.svelte"
  import {decodeRelay} from "@app/relays"
  import {makeSpacePath} from "@app/routes"

  interface Props {
    back?: () => unknown
    leading?: Snippet
    title?: Snippet
    action?: Snippet
    [key: string]: any
  }

  const {back = () => goto(makeSpacePath(url)), leading, title, action, ...props}: Props = $props()

  const url = decodeRelay($page.params.relay!)
</script>

<PageBar {...props}>
  <div class="flex">
    <Button onclick={back} class="place-self-start pr-3 md:hidden">
      <Icon icon={ArrowLeft} size={7} />
    </Button>
    <div class="flex grow items-center justify-between gap-4">
      <div class="flex min-w-0 flex-col">
        <div class="flex min-w-0 items-start gap-2">
          <RelayIcon {url} size={5} class="shrink-0 rounded-full md:hidden" />
          <div class="hidden shrink-0 md:flex md:items-center place-self-center">
            {@render leading?.()}
          </div>
          <div class="min-w-0">
            {@render title?.()}
          </div>
        </div>
        <div class="text-xs text-primary pl-7 md:hidden">
          {displayRelayUrl(url)}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        {@render action?.()}
      </div>
    </div>
  </div>
</PageBar>
