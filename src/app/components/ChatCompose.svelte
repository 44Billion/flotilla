<script lang="ts">
  import {onDestroy, onMount} from "svelte"
  import {writable} from "svelte/store"
  import cx from "classnames"
  import type {EventContent} from "@welshman/util"
  import {isMobile, preventDefault} from "@lib/html"
  import GallerySend from "@assets/icons/gallery-send.svg?dataurl"
  import Plane from "@assets/icons/plane-2.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import EditorContent from "@app/editor/EditorContent.svelte"
  import {makeEditor} from "@app/editor"
  import {type DraftKey} from "@app/util/drafts"

  type Values = {
    content?: string | object
  }

  type Props = {
    disabled?: boolean
    draftKey?: DraftKey<Values>
    onEscape?: () => void
    onEditPrevious?: () => void
    onSubmit: (event: EventContent) => void
    initialValues?: Values
  }

  let {
    initialValues,
    disabled = false,
    draftKey,
    onEscape,
    onEditPrevious,
    onSubmit,
  }: Props = $props()

  if (!initialValues) {
    initialValues = draftKey?.get()
  }

  const autofocus = !isMobile && !disabled

  const uploading = writable(false)

  const editorClass = $derived(
    cx("chat-editor grow overflow-hidden", {
      "pointer-events-none opacity-50": disabled,
    }),
  )

  export const focus = () => editor.then(ed => ed.chain().focus().run())

  export const canEnterEditPrevious = () =>
    editor.then(ed => ed.getText({blockSeparator: "\n"}) === "")

  const handleKeyDown = async (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onEscape?.()
    }

    if (event.key === "ArrowUp" && (await canEnterEditPrevious())) {
      onEditPrevious?.()
    }
  }

  const uploadFiles = () => editor.then(ed => ed.chain().selectFiles().run())

  const submit = async () => {
    if ($uploading || disabled) return

    const ed = await editor
    const content = ed.getText({blockSeparator: "\n"}).trim()
    const tags = ed.storage.nostr.getEditorTags()

    if (!content) return

    onSubmit({content, tags})

    draftKey?.clear()
    ed.chain().clearContent().run()
  }

  let content = $state(initialValues?.content ?? "")

  const onChange = (json: object) => {
    content = json
  }

  const editor = makeEditor({
    content,
    submit,
    uploading,
    onChange,
    aggressive: true,
    encryptFiles: true,
  })

  $effect(() => {
    draftKey?.set({content})
  })

  onMount(async () => {
    const ed = await editor
    ed.view.dom.addEventListener("keydown", handleKeyDown)
  })

  onDestroy(async () => {
    const ed = await editor
    ed?.view?.dom.removeEventListener("keydown", handleKeyDown)
  })
</script>

<form class="relative z-feature flex gap-2 p-2" onsubmit={preventDefault(submit)}>
  <Button
    data-tip="Add an image"
    class="center tooltip tooltip-right h-10 w-10 min-w-10 rounded-box bg-base-300 transition-colors hover:bg-base-200"
    disabled={$uploading || disabled}
    onclick={uploadFiles}>
    {#if $uploading}
      <span class="loading loading-spinner loading-xs"></span>
    {:else}
      <Icon icon={GallerySend} />
    {/if}
  </Button>
  <div class={editorClass} aria-disabled={disabled}>
    <EditorContent {autofocus} {editor} />
  </div>
  <Button
    data-tip="{window.navigator.platform.includes('Mac') ? 'cmd' : 'ctrl'}+enter to send"
    class="center tooltip tooltip-left absolute right-4 h-10 w-10 min-w-10 rounded-full"
    disabled={$uploading || disabled}
    onclick={submit}>
    <Icon icon={Plane} />
  </Button>
</form>
