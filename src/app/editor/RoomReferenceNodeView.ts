import type {NodeViewRendererProps} from "@tiptap/core"
import {displayRelayUrl} from "@welshman/util"
import {deriveRoom} from "@app/core/state"

export const RoomReferenceNodeView = ({node}: NodeViewRendererProps) => {
  const dom = document.createElement("span")
  const url = typeof node.attrs.url === "string" ? node.attrs.url : ""
  const h = typeof node.attrs.h === "string" ? node.attrs.h : ""
  const room = deriveRoom(url, h)

  dom.classList.add("tiptap-object")

  const unsubRoom = room.subscribe($room => {
    dom.textContent = `~${displayRelayUrl(url)} / ${$room.name || h}`
  })

  return {
    dom,
    destroy: () => {
      unsubRoom()
    },
    selectNode() {
      dom.classList.add("tiptap-active")
    },
    deselectNode() {
      dom.classList.remove("tiptap-active")
    },
  }
}
