<script lang="ts">
  import type {Snippet} from "svelte"
  import {page} from "$app/stores"
  import {goto} from "$app/navigation"
  import {displayRelayUrl} from "@welshman/util"
  import ArrowLeft from "@assets/icons/arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import PageBar from "@lib/components/PageBar.svelte"
  import {decodeRelay} from "@app/core/state"
  import {makeSpacePath} from "@app/util/routes"

  interface Props {
    back?: () => unknown
    title?: Snippet
    action?: Snippet
    [key: string]: any
  }

  const {back = () => goto(makeSpacePath(url)), title, action, ...props}: Props = $props()

  const url = decodeRelay($page.params.relay!)
</script>

<PageBar {...props}>
  <div class="flex">
    <Button onclick={back} class="place-self-start pr-2 sm:pr-6">
      <Icon icon={ArrowLeft} size={7} />
    </Button>
    <div class="ellipsize whitespace-nowrap flex flex-grow justify-between gap-4">
      <div class="flex flex-col">
        <div class="flex gap-2 items-center">
          {@render title?.()}
        </div>
        <div class="text-xs text-primary md:hidden">
          {displayRelayUrl(url)}
        </div>
      </div>
      <div class="flex gap-2 items-start">
        {@render action?.()}
      </div>
    </div>
  </div>
</PageBar>
