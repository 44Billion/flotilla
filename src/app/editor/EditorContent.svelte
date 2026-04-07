<script lang="ts">
  import {Editor} from "@welshman/editor"
  import {onDestroy, onMount} from "svelte"

  type Props = {
    editor: Promise<Editor>
  }

  const {editor}: Props = $props()

  let element: HTMLElement

  onMount(() => {
    editor.then(ed => {
      if (ed.options.element) {
        element?.append(ed.options.element)
      }

      if ((ed as any)._shouldAutofocus) {
        const hasContent = ed.getText().trim().length > 0

        requestAnimationFrame(() => {
          ed.commands.focus(hasContent ? "end" : "start")
        })
      }
    })
  })

  onDestroy(() => {
    editor.then($editor => $editor.destroy())
  })
</script>

<div bind:this={element}></div>
