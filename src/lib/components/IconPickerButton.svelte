<script lang="ts">
  import {type Instance} from "tippy.js"
  import {between, throttle} from "@welshman/lib"
  import {isMobile} from "@lib/html"
  import Button from "@lib/components/Button.svelte"
  import Tippy from "@lib/components/Tippy.svelte"
  import IconPickerModal from "@app/components/IconPickerModal.svelte"
  import IconPickerPopover from "@app/components/IconPickerPopover.svelte"
  import {pushModal, popModal} from "@app/util/modal"

  const {...props} = $props()

  const open = () => {
    if (isMobile) {
      pushModal(IconPickerModal, {onSelect: onClick}, {nested: true})
    } else {
      popover?.show()
    }
  }

  const close = () => {
    if (isMobile) {
      popModal()
    } else {
      popover?.hide()
    }
  }

  const onClick = (iconUrl: string) => {
    props.onSelect(iconUrl)
    close()
  }

  const onMouseMove = throttle(300, ({clientX, clientY}: any) => {
    if (popover) {
      const {x, width} = popover.popper.getBoundingClientRect()

      if (!between([x - 50, x + width + 50], clientX)) {
        popover.hide()
      }
    }
  })

  let popover: Instance | undefined = $state()
</script>

<svelte:document onmousemove={onMouseMove} />

<Tippy
  bind:popover
  component={IconPickerPopover}
  props={{onSelect: onClick}}
  params={{trigger: "manual", interactive: true, placement: "top-end"}}>
  <Button onclick={open} class={props.class}>
    {@render props.children?.()}
  </Button>
</Tippy>
