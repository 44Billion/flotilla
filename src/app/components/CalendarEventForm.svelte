<script lang="ts">
  import type {Snippet} from "svelte"
  import {writable} from "svelte/store"
  import {randomId, HOUR} from "@welshman/lib"
  import {makeEvent, EVENT_TIME} from "@welshman/util"
  import {publishThunk, waitForThunkError} from "@welshman/app"
  import {preventDefault} from "@lib/html"
  import {daysBetween} from "@lib/util"
  import GallerySend from "@assets/icons/gallery-send.svg?dataurl"
  import MapPoint from "@assets/icons/map-point.svg?dataurl"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Field from "@lib/components/Field.svelte"
  import Button from "@lib/components/Button.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import ModalFooter from "@lib/components/ModalFooter.svelte"
  import Modal from "@lib/components/Modal.svelte"
  import ModalBody from "@lib/components/ModalBody.svelte"
  import DateTimeInput from "@lib/components/DateTimeInput.svelte"
  import EditorContent from "@app/editor/EditorContent.svelte"
  import {PROTECTED} from "@app/core/state"
  import {makeEditor} from "@app/editor"
  import {DraftKey} from "@app/drafts"
  import {pushToast} from "@app/toast"
  import {canEnforceNip70, publishRoomQuote} from "@app/core/commands"

  type Values = {
    d: string
    title: string
    content: string | object
    location: string
    start?: number
    end?: number
  }

  type Props = {
    url: string
    h?: string
    shareToChat?: boolean
    header: Snippet
    initialValues?: Values
  }

  let {url, h, shareToChat = false, header, initialValues}: Props = $props()

  const draftKey = new DraftKey<Values>(`calendar:${url}:${h ?? ""}`)

  if (!initialValues) {
    initialValues = draftKey.get()
  }

  const shouldProtect = canEnforceNip70(url)

  const uploading = writable(false)

  const back = () => history.back()

  const selectFiles = () => editor.then(ed => ed.chain().selectFiles().run())

  const submit = async () => {
    if ($uploading || loading) return

    if (!title) {
      return pushToast({
        theme: "error",
        message: "Please provide a title.",
      })
    }

    if (!start || !end) {
      return pushToast({
        theme: "error",
        message: "Please provide start and end times.",
      })
    }

    if (start >= end) {
      return pushToast({
        theme: "error",
        message: "End time must be later than start time.",
      })
    }

    const ed = await editor
    const content = ed.getText({blockSeparator: "\n"}).trim()
    const tags = [
      ["d", d],
      ["title", title],
      ["location", location],
      ["start", start.toString()],
      ["end", end.toString()],
      ...daysBetween(start, end).map(D => ["D", D.toString()]),
      ...ed.storage.nostr.getEditorTags(),
    ]

    loading = true

    try {
      const protect = await shouldProtect

      if (protect) {
        tags.push(PROTECTED)
      }

      if (h) {
        tags.push(["h", h])
      }

      const event = makeEvent(EVENT_TIME, {content, tags})
      const calendarThunk = publishThunk({event, relays: [url]})
      const error = await waitForThunkError(calendarThunk)

      if (error) {
        return pushToast({theme: "error", message: error})
      }

      draftKey.clear()
      history.back()

      if (shareToChat) {
        publishRoomQuote({url, h, parent: calendarThunk.event, protect})
      }

      pushToast({message: "Your event has been saved!"})
    } finally {
      loading = false
    }
  }

  let loading = $state(false)

  const d = $state(initialValues?.d ?? randomId())
  let title = $state(initialValues?.title ?? "")
  let location = $state(initialValues?.location ?? "")
  let start: number | undefined = $state(initialValues?.start)
  let end: number | undefined = $state(initialValues?.end)
  let endDirty = $state(Boolean(initialValues?.end))
  let content = $state(initialValues?.content ?? "")

  const onChange = (json: object) => {
    content = json
  }

  const editor = makeEditor({url, submit, uploading, onChange, content})

  $effect(() => {
    draftKey.set({d, title, location, start, end, content})
  })

  $effect(() => {
    if (!endDirty && start) {
      end = start + HOUR
    } else if (end) {
      endDirty = true
    }
  })
</script>

<Modal tag="form" novalidate onsubmit={preventDefault(submit)}>
  <ModalBody>
    {@render header()}
    <Field>
      {#snippet label()}
        <p>Title*</p>
      {/snippet}
      {#snippet input()}
        <label class="input input-bordered flex w-full items-center gap-2">
          <input bind:value={title} class="grow" type="text" />
        </label>
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        <p>Summary</p>
      {/snippet}
      {#snippet input()}
        <div
          class="relative z-feature flex gap-2 border-t border-solid border-base-100 bg-base-100">
          <div class="input-editor grow overflow-hidden">
            <EditorContent {editor} />
          </div>
          <Button
            data-tip="Add an image"
            class="center btn tooltip"
            onclick={selectFiles}
            disabled={loading}>
            {#if $uploading}
              <span class="loading loading-spinner loading-xs"></span>
            {:else}
              <Icon icon={GallerySend} />
            {/if}
          </Button>
        </div>
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        Start*
      {/snippet}
      {#snippet input()}
        <DateTimeInput bind:value={start} />
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        End*
      {/snippet}
      {#snippet input()}
        <DateTimeInput bind:value={end} />
      {/snippet}
    </Field>
    <Field>
      {#snippet label()}
        <p>Location (optional)</p>
      {/snippet}
      {#snippet input()}
        <label class="input input-bordered flex w-full items-center gap-2">
          <Icon icon={MapPoint} />
          <input bind:value={location} class="grow" type="text" />
        </label>
      {/snippet}
    </Field>
  </ModalBody>
  <ModalFooter>
    <Button class="btn btn-link" onclick={back} disabled={loading}>
      <Icon icon={AltArrowLeft} />
      Go back
    </Button>
    <Button type="submit" class="btn btn-primary" disabled={$uploading || loading}>
      <Spinner loading={$uploading || loading}>Save Event</Spinner>
    </Button>
  </ModalFooter>
</Modal>
