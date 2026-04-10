<script lang="ts">
  import {writable} from "svelte/store"
  import {makeEvent, THREAD} from "@welshman/util"
  import {publishThunk, waitForThunkError} from "@welshman/app"
  import {isMobile, preventDefault} from "@lib/html"
  import Paperclip from "@assets/icons/paperclip-2.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Field from "@lib/components/Field.svelte"
  import Button from "@lib/components/Button.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
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
  import {canEnforceNip70, publishRoomQuote} from "@app/core/commands"

  type Values = {
    content?: string | object
    title?: string
  }

  type Props = {
    url: string
    h?: string
    shareToChat?: boolean
  }

  const {url, h, shareToChat = false}: Props = $props()
  const draftKey = new DraftKey<Values>(`thread:${url}:${h ?? ""}`)
  const initialValues = draftKey.get()
  const shouldProtect = canEnforceNip70(url)

  const uploading = writable(false)

  const back = () => history.back()

  const selectFiles = () => editor.then(ed => ed.commands.selectFiles())

  const submit = async () => {
    if ($uploading || loading) return

    if (!title) {
      return pushToast({
        theme: "error",
        message: "Please provide a title for your thread.",
      })
    }

    const ed = await editor
    const content = ed.getText({blockSeparator: "\n"}).trim()

    if (!content.trim()) {
      return pushToast({
        theme: "error",
        message: "Please provide a message for your thread.",
      })
    }

    const tags = [...ed.storage.nostr.getEditorTags(), ["title", title]]

    loading = true

    try {
      const protect = await shouldProtect

      if (protect) {
        tags.push(PROTECTED)
      }

      if (h) {
        tags.push(["h", h])
      }

      const threadThunk = publishThunk({
        relays: [url],
        event: makeEvent(THREAD, {content, tags}),
      })

      const error = await waitForThunkError(threadThunk)

      if (error) {
        return pushToast({theme: "error", message: error})
      }

      draftKey.clear()
      history.back()

      if (shareToChat) {
        publishRoomQuote({url, h, parent: threadThunk.event, protect})
      }
    } finally {
      loading = false
    }
  }

  let loading = $state(false)

  let title = $state(initialValues?.title ?? "")
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
    draftKey.update({title, content})
  })
</script>

<Modal tag="form" onsubmit={preventDefault(submit)}>
  <ModalBody>
    <ModalHeader>
      <ModalTitle>Create a Thread</ModalTitle>
      <ModalSubtitle>Share a link, or start a discussion.</ModalSubtitle>
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
              placeholder="What is this thread about?" />
          </label>
        {/snippet}
      </Field>
      <Field>
        {#snippet label()}
          <p>Message*</p>
        {/snippet}
        {#snippet input()}
          <div class="note-editor grow overflow-hidden">
            <EditorContent {editor} />
          </div>
        {/snippet}
      </Field>
      <Button
        data-tip="Add an image"
        class="tooltip tooltip-left absolute bottom-1 right-2"
        onclick={selectFiles}
        disabled={loading}>
        {#if $uploading}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          <Icon icon={Paperclip} size={3} />
        {/if}
      </Button>
    </div>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back} disabled={loading}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button type="submit" class="btn btn-primary" disabled={$uploading || loading}>
      <Spinner {loading}>Create Thread</Spinner>
    </Button>
  </ModalFooter>
</Modal>
