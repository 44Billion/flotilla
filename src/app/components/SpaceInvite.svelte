<script lang="ts">
  import {onMount} from "svelte"
  import {sleep} from "@welshman/lib"
  import {request} from "@welshman/net"
  import {displayRelayUrl, getTagValue, ManagementMethod, RELAY_INVITE} from "@welshman/util"
  import {Share} from "@capacitor/share"
  import LinkRound from "@assets/icons/link-round.svg?dataurl"
  import Upload from "@assets/icons/upload.svg?dataurl"
  import Copy from "@assets/icons/copy.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Spinner from "@lib/components/Spinner.svelte"
  import Field from "@lib/components/Field.svelte"
  import Button from "@lib/components/Button.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Divider from "@lib/components/Divider.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import ProfileMultiSelect from "@app/components/ProfileMultiSelect.svelte"
  import QRCode from "@app/components/QRCode.svelte"
  import {clip, pushToast} from "@app/toast"
  import {PLATFORM_URL} from "@app/env"
  import {deriveRelayAuthError, deriveSupportedMethods} from "@app/relays"
  import {addSpaceMembers} from "@app/members"

  const {url} = $props()

  const supportedMethods = deriveSupportedMethods(url)
  const canAddMembers = $derived($supportedMethods.includes(ManagementMethod.AllowPubkey))
  const authError = deriveRelayAuthError(url)

  let networkError = $state(false)
  const isExplicitAuthError = $derived(
    $authError &&
      !(
        $authError.toLowerCase().includes("failed") ||
        $authError.toLowerCase().includes("timeout") ||
        $authError.toLowerCase().includes("network")
      ),
  )
  const isGenericError = $derived(networkError || ($authError && !isExplicitAuthError))

  const back = () => history.back()
  const copyInvite = () => clip(invite)

  const shareInvite = async () => {
    if (!canShare) return

    try {
      await Share.share({url: invite})
    } catch (e) {
      console.error(e)
    }
  }

  let canShare = $state(false)
  let claim = $state("")
  let loading = $state(true)
  let invite = $state("")

  let adding = $state(false)
  let pubkeys: string[] = $state([])

  const addMembers = async () => {
    if (pubkeys.length === 0) return

    adding = true

    try {
      const error = await addSpaceMembers(url, pubkeys)

      if (error) {
        pushToast({theme: "error", message: error})
      } else {
        pushToast({message: "Members have successfully been added!"})
        back()
      }
    } finally {
      adding = false
    }
  }

  $effect(() => {
    const relay = displayRelayUrl(url)
    const params = new URLSearchParams({r: relay, c: claim}).toString()
    invite = PLATFORM_URL + "/join?" + params
  })

  onMount(async () => {
    try {
      const {value} = await Share.canShare()
      canShare = value
    } catch {
      canShare = false
    }

    try {
      const [[event]] = await Promise.all([
        request({
          relays: [url],
          autoClose: true,
          signal: AbortSignal.timeout(10000),
          filters: [{kinds: [RELAY_INVITE]}],
        }),
        sleep(2000),
      ])

      claim = getTagValue("claim", event?.tags || []) || ""
    } catch (err) {
      claim = ""
      if (
        (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) ||
        !navigator.onLine
      ) {
        networkError = true
      }
    } finally {
      loading = false
    }
  })
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Create an Invite</ModalTitle>
      <ModalSubtitle>
        Get a link that you can use to invite people to
        <span class="text-primary">{displayRelayUrl(url)}</span>
      </ModalSubtitle>
    </ModalHeader>
    <div>
      {#if loading}
        <p class="center">
          <Spinner {loading}>Requesting an invite link...</Spinner>
        </p>
      {:else if isGenericError}
        <p class="center text-center">
          Unable to reach the relay. Please check your connection and try again.
        </p>
      {:else if isExplicitAuthError}
        <p class="center">Oops! It looks like you're not a member of this relay.</p>
      {:else}
        <div class="flex flex-col items-center gap-6">
          <div class="w-48">
            <QRCode code={invite} />
          </div>
          <Field>
            {#snippet input()}
              <div class="flex w-full gap-2">
                {#if canShare}
                  <Button
                    class="input input-bordered flex w-12 shrink-0 items-center justify-center p-0"
                    onclick={shareInvite}>
                    <Icon icon={Upload} />
                  </Button>
                {/if}

                <label class="input input-bordered flex min-w-0 flex-1 items-center gap-2">
                  <Icon icon={LinkRound} class="shrink-0" />
                  <input bind:value={invite} class="min-w-0 flex-1 truncate" type="text" readonly />
                  <Button class="shrink-0" onclick={copyInvite}>
                    <Icon icon={Copy} />
                  </Button>
                </label>
              </div>
            {/snippet}
            {#snippet info()}
              <p>
                This invite link can be used by clicking "Add Space" and pasting it there.
                {#if !claim}
                  This space did not issue a claim for this link, so additional steps might be
                  required.
                {/if}
              </p>
            {/snippet}
          </Field>
        </div>
      {/if}
    </div>
    {#if canAddMembers}
      <Divider>or</Divider>
      <Field>
        {#snippet label()}
          <p>Add members directly</p>
        {/snippet}
        {#snippet input()}
          <ProfileMultiSelect bind:value={pubkeys} />
        {/snippet}
      </Field>
    {/if}
  </ModalBody>
  <ModalFooter>
    {#if canAddMembers}
      <Button class="btn btn-link" onclick={back}>
        <Icon icon={AltArrowLeft} />
        Go back
      </Button>
      <Button
        class="btn btn-primary"
        onclick={addMembers}
        disabled={adding || pubkeys.length === 0}>
        <Spinner loading={adding}>Save</Spinner>
      </Button>
    {:else}
      <Button class="btn btn-primary grow" onclick={back}>Done</Button>
    {/if}
  </ModalFooter>
</Modal>
