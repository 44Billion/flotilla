<script lang="ts">
  import type {Readable} from "svelte/store"
  import Stars from "@assets/icons/stars.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import DangerTriangle from "@assets/icons/danger-triangle.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import type {ActionItem} from "@app/components/RelaySettingsActionItem.svelte"
  import RelaySettingsActionItem from "@app/components/RelaySettingsActionItem.svelte"

  interface Props {
    actionItems: Readable<ActionItem[]>
  }

  const {actionItems}: Props = $props()

  const back = () => history.back()

  const applyAll = () => {
    for (const actionItem of $actionItems) {
      actionItem.apply()
    }
  }

  $effect(() => {
    if ($actionItems.length === 0) {
      back()
    }
  })
</script>

<Modal>
  <ModalBody>
    <div class="flex gap-2 items-center">
      <Icon icon={DangerTriangle} />
      <strong class="text-lg">Action Items</strong>
    </div>
    <p class="text-sm">
      Below are recommendations for adjustments to your relay selections that you might consider.
    </p>
    {#each $actionItems as actionItem}
      <RelaySettingsActionItem {...actionItem} />
    {/each}
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go Back
    </Button>
    <Button class="btn btn-primary" onclick={applyAll}>
      <Icon icon={Stars} />
      Apply All Recommendations
    </Button>
  </ModalFooter>
</Modal>
