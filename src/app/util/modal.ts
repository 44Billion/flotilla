import type {Component} from "svelte"
import {get, writable} from "svelte/store"
import {randomId, always, assoc, Emitter} from "@welshman/lib"
import {deriveDeduplicated} from "@welshman/store"
import {goto} from "$app/navigation"
import {page} from "$app/stores"

export type ModalOptions = {
  drawer?: boolean
  nested?: boolean
  noEscape?: boolean
  fullscreen?: boolean
  replaceState?: boolean
  path?: string
}

export type Modal = {
  id: string
  component: Component
  props: Record<string, any>
  options: ModalOptions
}

export const emitter = new Emitter()

export const modals = writable<Record<string, Modal>>({})

const getIdsFromHash = (hash: string) => hash.slice(1).split(",").filter(Boolean)

export const modalStack = deriveDeduplicated([page, modals], ([$page, $modals]) => {
  return getIdsFromHash($page.url.hash)
    .map(id => $modals[id])
    .filter(Boolean)
})

export const modal = deriveDeduplicated([page, modals], ([$page, $modals]) => {
  const ids = getIdsFromHash($page.url.hash)

  return $modals[ids.at(-1) || ""]
})

export const pushModal = (
  component: Component<any>,
  props: Record<string, any> = {},
  options: ModalOptions = {},
) => {
  const id = randomId()
  const path = options.path || ""
  const existingIds = getIdsFromHash(get(page).url.hash)
  const ids = options.nested ? [...existingIds, id] : [id]

  modals.update(assoc(id, {id, component, props, options}))

  goto(path + "#" + ids.join(","), {replaceState: options.replaceState})

  return id
}

export const pushDrawer = (
  component: Component<any>,
  props: Record<string, any> = {},
  options: ModalOptions = {},
) => pushModal(component, props, {...options, drawer: true})

export const popModal = () => {
  const url = get(page).url
  const ids = getIdsFromHash(url.hash)

  if (ids.length === 0) {
    return
  }

  const next = ids.slice(0, -1).join(",")
  const hash = next ? `#${next}` : ""

  goto(url.pathname + url.search + hash, {replaceState: true})
}

export const clearModals = () => {
  const url = get(page).url

  goto(url.pathname + url.search, {replaceState: true})
  modals.update(always({}))
  emitter.emit("close")
}
