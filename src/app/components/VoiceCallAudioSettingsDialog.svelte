<script lang="ts">
  import Button from "@lib/components/Button.svelte"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import {currentVoiceSession, type VoiceSession} from "@app/call/stores"
  import {DeviceKind, supportsAudioOutputSelection, switchVoiceActiveDevice} from "@app/call/voice"
  import {popModal} from "@app/util/modal"

  const selectValueForActiveDevice = (session: VoiceSession, kind: DeviceKind): string => {
    const livekitDeviceId = session.room.getActiveDevice(kind)
    if (livekitDeviceId === undefined || livekitDeviceId === "" || livekitDeviceId === "default") {
      return ""
    }
    return livekitDeviceId
  }

  let audioInputs = $state<MediaDeviceInfo[]>([])
  let audioOutputs = $state<MediaDeviceInfo[]>([])
  let videoInputs = $state<MediaDeviceInfo[]>([])
  let selectedInput = $state("")
  let selectedOutput = $state("")
  let selectedVideo = $state("")

  const loadDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      audioInputs = devices.filter(d => d.kind === "audioinput")
      audioOutputs = devices.filter(d => d.kind === "audiooutput")
      videoInputs = devices.filter(d => d.kind === "videoinput")
    } catch {
      audioInputs = []
      audioOutputs = []
      videoInputs = []
    }
  }

  $effect(() => {
    loadDevices()
    navigator.mediaDevices?.addEventListener?.("devicechange", loadDevices)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", loadDevices)
  })

  $effect(() => {
    const session = $currentVoiceSession
    if (!session) {
      popModal()
      return
    }
    selectedInput = selectValueForActiveDevice(session, DeviceKind.AudioInput)
    selectedOutput = selectValueForActiveDevice(session, DeviceKind.AudioOutput)
    selectedVideo = selectValueForActiveDevice(session, DeviceKind.VideoInput)
  })

  const onInputChange = () => {
    void switchVoiceActiveDevice(DeviceKind.AudioInput, selectedInput)
  }

  const onOutputChange = () => {
    void switchVoiceActiveDevice(DeviceKind.AudioOutput, selectedOutput)
  }

  const onVideoChange = () => {
    void switchVoiceActiveDevice(DeviceKind.VideoInput, selectedVideo)
  }

  const onDone = () => {
    popModal()
  }

  // Output not support in Safari
  const canPickOutput = supportsAudioOutputSelection()
</script>

<Modal>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Call settings</ModalTitle>
      <ModalSubtitle>Microphone, speaker, and camera for this call.</ModalSubtitle>
    </ModalHeader>
    <div class="flex flex-col gap-4 pt-2">
      <FieldInline>
        {#snippet label()}
          <p>Microphone</p>
        {/snippet}
        {#snippet input()}
          <select
            class="select select-bordered w-full"
            bind:value={selectedInput}
            onchange={onInputChange}
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
      {#if canPickOutput}
        <FieldInline>
          {#snippet label()}
            <p>Speaker</p>
          {/snippet}
          {#snippet input()}
            <select
              class="select select-bordered w-full"
              bind:value={selectedOutput}
              onchange={onOutputChange}
              aria-label="Speaker">
              <option value="">Default speaker</option>
              {#each audioOutputs as d (d.deviceId)}
                <option value={d.deviceId}>
                  {d.label || `Speaker ${d.deviceId.slice(0, 8)}…`}
                </option>
              {/each}
            </select>
          {/snippet}
        </FieldInline>
      {/if}
      <FieldInline>
        {#snippet label()}
          <p>Camera</p>
        {/snippet}
        {#snippet input()}
          <select
            class="select select-bordered w-full"
            bind:value={selectedVideo}
            onchange={onVideoChange}
            aria-label="Camera">
            <option value="">Default camera</option>
            {#each videoInputs as d (d.deviceId)}
              <option value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 8)}…`}
              </option>
            {/each}
          </select>
        {/snippet}
      </FieldInline>
    </div>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-primary w-full" onclick={onDone}>Done</Button>
  </ModalFooter>
</Modal>
