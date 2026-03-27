<script lang="ts">
  import {displayRelayUrl} from "@welshman/util"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import AltArrowRight from "@assets/icons/alt-arrow-right.svg?dataurl"
  import Volume from "@assets/icons/volume.svg?dataurl"
  import Button from "@lib/components/Button.svelte"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import {displayRoom} from "@app/core/state"
  import {joinVoiceRoom} from "@app/voice"
  import {popModal} from "@app/util/modal"

  type Props = {
    url: string
    h: string
  }

  const {url, h}: Props = $props()

  const spaceLabel = $derived(displayRelayUrl(url))

  let audioInputs = $state<MediaDeviceInfo[]>([])
  let selectedDeviceId = $state("")
  let startWithoutMic = $state(false)

  const loadDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      audioInputs = devices.filter(d => d.kind === "audioinput")
    } catch {
      audioInputs = []
    }
  }

  $effect(() => {
    void loadDevices()
  })

  const goBack = () => history.back()

  const joinVoice = async () => {
    popModal()
    await joinVoiceRoom(
      url,
      h,
      startWithoutMic,
      startWithoutMic ? undefined : selectedDeviceId || undefined,
    )
  }
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Join voice room?</ModalTitle>
      <ModalSubtitle>
        <span class="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <Icon icon={Volume} size={4} class="shrink-0" />
          <span class="ellipsize min-w-0">{displayRoom(url, h)}</span>
          <span>·</span>
          <span>{spaceLabel}</span>
        </span>
      </ModalSubtitle>
    </ModalHeader>
    <p class="text-sm opacity-80">Select a microphone to join the call:</p>
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex items-center gap-2">
        <input
          id="voice-start-without-mic"
          type="checkbox"
          class="checkbox"
          bind:checked={startWithoutMic} />
        <label for="voice-start-without-mic" class="text-sm cursor-pointer">
          Join without microphone (you can unmute later)
        </label>
      </div>
      <FieldInline>
        {#snippet label()}
          <p>Microphone</p>
        {/snippet}
        {#snippet input()}
          <select
            class="select select-bordered w-full"
            bind:value={selectedDeviceId}
            disabled={startWithoutMic}
            aria-label="Microphone">
            <option value="">Default microphone</option>
            {#each audioInputs as d (d.deviceId)}
              <option value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}…`}
              </option>
            {/each}
          </select>
        {/snippet}
      </FieldInline>
    </div>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={goBack}>
      <Icon icon={AltArrowLeft} />
      Don't join
    </Button>
    <Button class="btn btn-primary" onclick={joinVoice}>
      Join voice
      <Icon icon={AltArrowRight} />
    </Button>
  </ModalFooter>
</Modal>
