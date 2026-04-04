import theme from "tailwindcss/defaultTheme"
import {get} from "svelte/store"
import * as nip19 from "nostr-tools/nip19"
import {goto} from "$app/navigation"
import {page} from "$app/stores"
import {nthEq} from "@welshman/lib"
import type {TrustedEvent} from "@welshman/util"
import {getAddress} from "@welshman/util"
import {Poll} from "nostr-tools/kinds"
import {tracker, userMessagingRelayList} from "@welshman/app"
import {identity} from "@welshman/lib"
import {
  getTagValue,
  MESSAGE,
  THREAD,
  CLASSIFIED,
  ZAP_GOAL,
  EVENT_TIME,
  getPubkeyTagValues,
  getRelaysFromList,
} from "@welshman/util"
import {makeChatId, entityLink, encodeRelay, DM_KINDS, ROOM} from "@app/core/state"
import {pushModal} from "@app/util/modal"
import {lastPageBySpaceUrl, lastChatUrl} from "@app/util/history"
import ChatEnable from "@app/components/ChatEnable.svelte"

// Chat

export const makeChatPath = (pubkeys: string[]) => `/chat/${makeChatId(pubkeys)}`

export const makeRoomPath = (url: string, h: string) => `/spaces/${encodeRelay(url)}/${h}`

export const makeSpaceChatPath = (url: string) => makeRoomPath(url, "chat")

export const goToChat = (pubkeys: string[] = []) => {
  if (getRelaysFromList(get(userMessagingRelayList)).length === 0) {
    pushModal(ChatEnable, {next: () => goToChat(pubkeys)})
  } else if (pubkeys.length === 0) {
    goto(lastChatUrl ?? "/chat")
  } else {
    goto(makeChatPath(pubkeys))
  }
}

// Spaces

export const makeSpacePath = (url: string, ...extra: (string | undefined)[]) => {
  let path = `/spaces/${encodeRelay(url)}`

  if (extra.length > 0) {
    path +=
      "/" +
      extra
        .filter(identity)
        .map(s => encodeURIComponent(s as string))
        .join("/")
  }

  return path
}

export const goToSpace = async (url: string) => {
  const prevPath = lastPageBySpaceUrl.get(encodeRelay(url))

  if (prevPath && prevPath !== makeSpacePath(url)) {
    goto(prevPath, {replaceState: true})
  } else if (window.matchMedia(`(min-width: ${theme.screens.md})`).matches) {
    goto(makeSpacePath(url, "recent"), {replaceState: true})
  } else {
    goto(makeSpacePath(url), {replaceState: true})
  }
}

// Content types, events

export const makeMessagePath = (url: string, event: TrustedEvent) => {
  const h = getTagValue(ROOM, event.tags)
  const path = h ? makeRoomPath(url, h) : makeSpaceChatPath(url)
  const qp = new URLSearchParams({at: String(event.created_at)})

  return path + "?" + qp.toString()
}

export const makeGoalPath = (url: string, id?: string) => makeSpacePath(url, "goals", id)

export const makeThreadPath = (url: string, id?: string) => makeSpacePath(url, "threads", id)

export const makeClassifiedPath = (url: string, address?: string) =>
  makeSpacePath(url, "classifieds", address)

export const makeCalendarPath = (url: string, address?: string) =>
  makeSpacePath(url, "calendar", address)

export const makePollPath = (url: string, id?: string) => makeSpacePath(url, "polls", id)

export const scrollToEvent = (id: string) => {
  const element = document.querySelector(`[data-event="${id}"]`) as any

  if (element) {
    element.scrollIntoView({behavior: "smooth", block: "center"})
    element.style = "filter: brightness(1.5); transition-property: all; transition-duration: 400ms;"

    setTimeout(() => {
      element.style = "transition-property: all; transition-duration: 300ms;"
    }, 800)

    setTimeout(() => {
      element.style = ""
    }, 800 + 400)
  }

  return Boolean(element)
}

export const goToEvent = (event: TrustedEvent, options: Record<string, any> = {}) => {
  const urls = Array.from(tracker.getRelays(event.id))
  const path = getEventPath(event, urls)

  if (path.includes("://")) {
    window.open(path)
  } else if (!scrollToEvent(event.id)) {
    const replaceState = path.replace(/\?.*$/, "") === get(page).url.pathname

    goto(path, {replaceState, ...options})
  }
}

export const getEventPath = (event: TrustedEvent, urls: string[]) => {
  if (DM_KINDS.includes(event.kind)) {
    return makeChatPath([event.pubkey, ...getPubkeyTagValues(event.tags)])
  }

  if (urls.length > 0) {
    const url = urls[0]

    if (event.kind === ZAP_GOAL) {
      return makeGoalPath(url, event.id)
    }

    if (event.kind === THREAD) {
      return makeThreadPath(url, event.id)
    }

    if (event.kind === CLASSIFIED) {
      return makeClassifiedPath(url, getAddress(event))
    }

    if (event.kind === EVENT_TIME) {
      return makeCalendarPath(url, getAddress(event))
    }

    if (event.kind === Poll) {
      return makePollPath(url, event.id)
    }

    if (event.kind === MESSAGE) {
      return makeMessagePath(url, event)
    }

    const address = event.tags.find(nthEq(0, "A"))?.[1]
    const kind = event.tags.find(nthEq(0, "K"))?.[1]
    const id = event.tags.find(nthEq(0, "E"))?.[1]

    if (id && kind) {
      if (parseInt(kind) === ZAP_GOAL) {
        return makeGoalPath(url, id)
      }

      if (parseInt(kind) === THREAD) {
        return makeThreadPath(url, id)
      }

      if (parseInt(kind) === MESSAGE) {
        return makeMessagePath(url, event)
      }
    }

    if (address && kind) {
      if (parseInt(kind) === CLASSIFIED) {
        return makeClassifiedPath(url, address)
      }

      if (parseInt(kind) === EVENT_TIME) {
        return makeCalendarPath(url, address)
      }
    }
  }

  return entityLink(nip19.neventEncode({id: event.id, relays: urls}))
}

export const getRoomItemPath = (url: string, event: TrustedEvent) => {
  switch (event.kind) {
    case THREAD:
      return makeThreadPath(url, event.id)
    case CLASSIFIED:
      return makeClassifiedPath(url, getAddress(event))
    case ZAP_GOAL:
      return makeGoalPath(url, event.id)
    case EVENT_TIME:
      return makeCalendarPath(url, getAddress(event))
    case Poll:
      return makePollPath(url, event.id)
  }
}
