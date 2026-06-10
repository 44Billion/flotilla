<script lang="ts">
  import cx from "classnames"
  import {first} from "@welshman/lib"
  import type {NativeEmoji} from "emoji-picker-element/shared"
  import {signer, deriveZapperForPubkey} from "@welshman/app"
  import {load} from "@welshman/net"
  import {Router} from "@welshman/router"
  import {requestZap, makeZapRequest, getZapResponseFilter} from "@welshman/util"
  import Bolt from "@assets/icons/bolt.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import Button from "@lib/components/Button.svelte"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import EmojiButton from "@lib/components/EmojiButton.svelte"
  import {errorMessage} from "@lib/util"
  import ProfileLink from "@app/components/ProfileLink.svelte"
  import {payInvoice} from "@app/lightning"
  import {zapAmounts} from "@app/settings"
  import {pushToast} from "@app/toast"

  type Props = {
    url: string
    pubkey: string
    eventId?: string
  }

  const {url, pubkey, eventId}: Props = $props()

  const zapperStore = deriveZapperForPubkey(pubkey)

  const back = () => history.back()

  const selectAmount = (preset: number) => {
    amount = preset
  }

  const onEmoji = (emoji: NativeEmoji) => {
    content = emoji.unicode
  }

  const sendZap = async () => {
    loading = true

    try {
      const zapper = $zapperStore!
      const msats = amount * 1000
      const relays = url ? [url] : Router.get().ForPubkey(pubkey).getUrls()
      const filters = [getZapResponseFilter({zapper, pubkey, eventId})]
      const params = {pubkey, content, eventId, msats, relays, zapper}
      const event = await $signer!.sign(makeZapRequest(params))
      const res = await requestZap({zapper, event})

      if (!res.invoice) {
        return pushToast({
          theme: "error",
          message: `Failed to zap: ${res.error || "no error given"}`,
        })
      }

      await payInvoice(res.invoice)
      await load({relays, filters})

      pushToast({message: "Zap successfully sent!"})
      back()
    } catch (e) {
      console.error(e)

      const message = errorMessage(e)

      pushToast({
        theme: "error",
        message: `Failed to zap: ${message}`,
      })
    } finally {
      loading = false
    }
  }

  let amount = $state<number>(first($zapAmounts) ?? 21)
  let content = $state("⚡️")
  let loading = $state(false)
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Send a Zap</ModalTitle>
      <ModalSubtitle>To <ProfileLink {pubkey} class="text-primary!" /></ModalSubtitle>
    </ModalHeader>
    <FieldInline class="grid-cols-3!">
      {#snippet label()}
        Emoji Reaction
      {/snippet}
      {#snippet input()}
        <div class="flex grow items-center justify-end gap-4">
          <EmojiButton {onEmoji} class="btn btn-neutral">
            {content}
          </EmojiButton>
        </div>
      {/snippet}
    </FieldInline>
    <FieldInline class="grid-cols-3!">
      {#snippet label()}
        Amount
      {/snippet}
      {#snippet input()}
        <div class="flex grow justify-end">
          <label class="input input-bordered flex items-center gap-2">
            <Icon icon={Bolt} />
            <input bind:value={amount} type="number" class="w-24" />
          </label>
        </div>
      {/snippet}
    </FieldInline>
    <div class="flex flex-wrap justify-end gap-2">
      {#each $zapAmounts as preset}
        <Button
          class={cx("btn btn-sm rounded-full", preset === amount ? "btn-primary" : "btn-neutral")}
          onclick={() => selectAmount(preset)}>
          {preset}
        </Button>
      {/each}
    </div>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button class="btn btn-primary" onclick={sendZap} disabled={loading}>
      <Spinner {loading}>
        <div class="flex items-center gap-2">
          {#if !loading}
            <Icon icon={Bolt} />
          {/if}
          Send Zap
        </div>
      </Spinner>
    </Button>
  </ModalFooter>
</Modal>
