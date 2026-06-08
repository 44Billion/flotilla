import {DELETE, PROFILE, getPubkeyTagValues} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {append, call, on, reject, remove, sort, sortBy, spec, uniq, uniqBy} from "@welshman/lib"
import type {Override} from "@welshman/lib"
import {createSearch, displayProfileByPubkey, pubkey, repository} from "@welshman/app"
import {derived, readable} from "svelte/store"
import {DM_KINDS} from "@app/content"
import type {RepositoryUpdate} from "@welshman/net"
import {makeDeriveItem, throttled} from "@welshman/store"
export type Chat = {
  id: string
  pubkeys: string[]
  messages: TrustedEvent[]
  last_activity: number
  search_text: string
}

export const getChatPubkeys = (pubkeys: string[]) => sort(uniq(append(pubkey.get()!, pubkeys)))

export const getChatPubkeysFromEvent = (event: TrustedEvent) =>
  getChatPubkeys(getPubkeyTagValues(event.tags).concat(event.pubkey))

export const makeChatId = (pubkeys: string[]) => {
  const userPubkey = pubkey.get()!
  const otherPubkeys = remove(userPubkey, uniq(pubkeys))
  const visiblePubkeys = otherPubkeys.length === 0 ? [userPubkey] : otherPubkeys

  return sort(visiblePubkeys).join(",")
}

export const splitChatId = (id: string) => getChatPubkeys(id.split(","))

export const chatsById = call(() => {
  const chatsById = new Map<string, Chat>()
  const chatsByPubkey = new Map<string, string[]>()

  const addSearchText = (chat: Override<Chat, {search_text?: string}>) => {
    chat.search_text =
      chat.pubkeys.length === 1
        ? displayProfileByPubkey(chat.pubkeys[0]) + " note to self"
        : remove(pubkey.get()!, chat.pubkeys).map(displayProfileByPubkey).join(" ")

    return chat as Chat
  }

  return readable(chatsById, set => {
    const indexChatByPubkeys = (chat: Chat) => {
      for (const pubkey of chat.pubkeys) {
        chatsByPubkey.set(pubkey, uniq(append(chat.id, chatsByPubkey.get(pubkey) || [])))
      }
    }

    const addEvents = (events: TrustedEvent[]) => {
      let dirty = false
      for (const event of events) {
        if (DM_KINDS.includes(event.kind)) {
          const pubkeys = getChatPubkeysFromEvent(event)
          const id = makeChatId(pubkeys)
          const chat = chatsById.get(id)
          const messages = sortBy(
            e => -e.created_at,
            uniqBy(e => e.id, append(event, chat?.messages || [])),
          )
          const last_activity = Math.max(chat?.last_activity || 0, event.created_at)
          const updatedChat = addSearchText({id, pubkeys, messages, last_activity})

          chatsById.set(id, updatedChat)
          indexChatByPubkeys(updatedChat)

          dirty = true
        }

        if (event.kind === PROFILE) {
          for (const chatId of chatsByPubkey.get(event.pubkey) || []) {
            const chat = chatsById.get(chatId)

            if (chat) {
              addSearchText(chat)
              dirty = true
            }
          }
        }
      }

      if (dirty) {
        set(chatsById)
      }
    }

    const removeEvents = (removed: Set<string>) => {
      let dirty = false

      for (const id of removed) {
        const event = repository.getEvent(id)

        if (event && DM_KINDS.includes(event.kind)) {
          for (const chatId of chatsByPubkey.get(event.pubkey) || []) {
            const chat = chatsById.get(chatId)

            if (chat) {
              chat.messages = reject(spec({id: event.id}), chat.messages)
              dirty = true
            }
          }
        }
      }

      if (dirty) {
        set(chatsById)
      }
    }

    addEvents(repository.query([{kinds: [...DM_KINDS, DELETE, PROFILE]}]))

    const unsubscribers = [
      on(repository, "update", ({added, removed}: RepositoryUpdate) => {
        // Do this async so that profiles are populated
        setTimeout(() => {
          addEvents(added)
          removeEvents(removed)
        }, 200)
      }),
    ]

    return () => unsubscribers.forEach(call)
  })
})

export const deriveChat = makeDeriveItem(chatsById)

export const chatSearch = derived(throttled(1500, chatsById), $chatsByPubkey => {
  return createSearch(
    sortBy(c => -c.last_activity, Array.from($chatsByPubkey.values())),
    {
      getValue: (chat: Chat) => chat.id,
      fuseOptions: {keys: ["search_text"]},
    },
  )
})
