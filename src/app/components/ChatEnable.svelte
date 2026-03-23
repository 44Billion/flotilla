<script lang="ts">
  import {getRelaysFromList} from "@welshman/util"
  import {waitForThunkError, setMessagingRelays, userRelayList, setRelays} from "@welshman/app"
  import {preventDefault} from "@lib/html"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import AltArrowRight from "@assets/icons/alt-arrow-right.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import {DEFAULT_RELAYS, DEFAULT_MESSAGING_RELAYS} from "@app/core/state"
  import {pushToast} from "@app/util/toast"

  type Props = {
    next: () => void
  }

  const {next}: Props = $props()

  let loading = $state(false)

  const back = () => history.back()

  const enable = async () => {
    loading = true

    try {
      if (getRelaysFromList($userRelayList).length === 0) {
        const error = await waitForThunkError(await setRelays(DEFAULT_RELAYS.map(r => ["r", r])))

        if (error) {
          pushToast({theme: "error", message: error})
          return
        }
      }

      const error = await waitForThunkError(await setMessagingRelays(DEFAULT_MESSAGING_RELAYS))

      if (error) {
        pushToast({theme: "error", message: error})
        return
      }

      await next()
    } finally {
      loading = false
    }
  }
</script>

<Modal tag="form" onsubmit={preventDefault(enable)}>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Enable direct messaging?</ModalTitle>
    </ModalHeader>
    <p>Direct messaging isn't currently enabled. Would you like to turn it on?</p>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button type="submit" class="btn btn-primary" disabled={loading}>
      <Spinner {loading}>Enable direct messaging</Spinner>
      <Icon icon={AltArrowRight} />
    </Button>
  </ModalFooter>
</Modal>
