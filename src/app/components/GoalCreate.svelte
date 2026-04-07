<script lang="ts">
  import {writable} from "svelte/store"
  import {makeEvent, ZAP_GOAL} from "@welshman/util"
  import {publishThunk} from "@welshman/app"
  import {isMobile, preventDefault} from "@lib/html"
  import Paperclip from "@assets/icons/paperclip-2.svg?dataurl"
  import Bolt from "@assets/icons/bolt.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Field from "@lib/components/Field.svelte"
  import FieldInline from "@lib/components/FieldInline.svelte"
  import Button from "@lib/components/Button.svelte"
  import ModalHeader from "@lib/components/ModalHeader.svelte"
  import ModalTitle from "@lib/components/ModalTitle.svelte"
  import ModalSubtitle from "@lib/components/ModalSubtitle.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import EditorContent from "@app/editor/EditorContent.svelte"
  import {pushToast} from "@app/util/toast"
  import {PROTECTED} from "@app/core/state"
  import {makeEditor} from "@app/editor"
  import {DraftKey} from "@app/util/drafts"
  import {canEnforceNip70} from "@app/core/commands"

  type Values = {
    title: string
    content: string | object
    amount: number
  }

  type Props = {
    url: string
    h?: string
    initialValues?: Values
  }

  let {url, h, initialValues}: Props = $props()

  const draftKey = new DraftKey<Values>(`goal:${url}:${h ?? ""}`)

  if (!initialValues) {
    initialValues = draftKey.get()
  }

  const shouldProtect = canEnforceNip70(url)

  const uploading = writable(false)

  const back = () => history.back()

  const selectFiles = () => editor.then(ed => ed.commands.selectFiles())

  const submit = async () => {
    if ($uploading) return

    if (!title) {
      return pushToast({
        theme: "error",
        message: "Please provide a title for your funding goal.",
      })
    }

    const ed = await editor
    const content = ed.getText({blockSeparator: "\n"}).trim()

    if (!content.trim()) {
      return pushToast({
        theme: "error",
        message: "Please provide details about your funding goal.",
      })
    }

    const tags = [
      ...ed.storage.nostr.getEditorTags(),
      ["summary", content],
      ["amount", String(amount)],
      ["relays", url],
    ]

    if (await shouldProtect) {
      tags.push(PROTECTED)
    }

    if (h) {
      tags.push(["h", h])
    }

    publishThunk({
      relays: [url],
      event: makeEvent(ZAP_GOAL, {content: title, tags}),
    })

    draftKey.clear()
    history.back()
  }

  let title = $state(initialValues?.title ?? "")
  let amount = $state(initialValues?.amount ?? 1000)
  let content = $state(initialValues?.content ?? "")

  const onChange = (json: object) => {
    content = json
  }

  const editor = makeEditor({
    url,
    submit,
    uploading,
    onChange,
    placeholder: "What's on your mind?",
    content,
  })

  $effect(() => {
    draftKey.update({title, content, amount})
  })
</script>

<Modal tag="form" onsubmit={preventDefault(submit)}>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Create a Funding Goal</ModalTitle>
      <ModalSubtitle>Request contributions for your fundraiser.</ModalSubtitle>
    </ModalHeader>
    <div class="col-8 relative">
      <Field>
        {#snippet label()}
          <p>Title*</p>
        {/snippet}
        {#snippet input()}
          <label class="input input-bordered flex w-full items-center gap-2">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              autofocus={!isMobile}
              bind:value={title}
              class="grow"
              type="text"
              placeholder="What do funds go towards?" />
          </label>
        {/snippet}
      </Field>
      <div class="relative">
        <Field>
          {#snippet label()}
            <p>Details*</p>
          {/snippet}
          {#snippet input()}
            <div class="note-editor flex-grow overflow-hidden">
              <EditorContent {editor} />
            </div>
          {/snippet}
        </Field>
        <Button
          data-tip="Add an image"
          class="tooltip tooltip-left absolute bottom-1 right-2"
          onclick={selectFiles}>
          {#if $uploading}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            <Icon icon={Paperclip} size={3} />
          {/if}
        </Button>
      </div>
      <div class="flex flex-col gap-1">
        <FieldInline>
          {#snippet label()}
            Goal Amount (sats)*
          {/snippet}
          {#snippet input()}
            <div class="flex flex-grow justify-end">
              <label class="input input-bordered flex items-center gap-2">
                <Icon icon={Bolt} />
                <input bind:value={amount} type="number" class="w-28" />
                <p class="opacity-50">sats</p>
              </label>
            </div>
          {/snippet}
        </FieldInline>
        <input
          class="range range-primary -mt-2"
          type="range"
          min="1000"
          max="100000"
          step="1000"
          bind:value={amount} />
      </div>
    </div>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button type="submit" class="btn btn-primary">Create Goal</Button>
  </ModalFooter>
</Modal>
