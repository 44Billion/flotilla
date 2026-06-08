<script lang="ts">
  import {assoc} from "@welshman/lib"
  import Check from "@assets/icons/check.svg?dataurl"
  import Bell from "@assets/icons/bell.svg?dataurl"
  import BellOff from "@assets/icons/bell-off.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import {setChecked} from "@app/notifications"
  import {notificationSettings} from "@app/settings"

  const markAsRead = () => {
    setChecked("/chat/*")
    history.back()
  }

  const enableAlerts = () => notificationSettings.update(assoc("messages", true))

  const disableAlerts = () => notificationSettings.update(assoc("messages", false))
</script>

<Modal>
  <ModalBody>
    <div class="flex flex-col gap-2">
      <Button class="btn btn-neutral" onclick={markAsRead}>
        <Icon size={5} icon={Check} />
        Mark all read
      </Button>
      {#if $notificationSettings.messages}
        <Button class="btn btn-neutral" onclick={disableAlerts}>
          <Icon size={4} icon={BellOff} />
          Disable alerts
        </Button>
      {:else}
        <Button class="btn btn-neutral" onclick={enableAlerts}>
          <Icon size={4} icon={Bell} />
          Enable alerts
        </Button>
      {/if}
    </div>
  </ModalBody>
</Modal>
