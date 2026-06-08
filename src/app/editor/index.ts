import {mount} from "svelte"
import type {Writable} from "svelte/store"
import {get, derived} from "svelte/store"
import {Router} from "@welshman/router"
import {dec, inc} from "@welshman/lib"
import {throttled} from "@welshman/store"
import type {PublishedProfile, RoomMeta} from "@welshman/util"
import {
  createSearch,
  profiles,
  searchProfiles,
  handlesByNip05,
  getMaxWot,
  getWotGraph,
} from "@welshman/app"
import type {FileAttributes} from "@welshman/editor"
import {
  Editor,
  MentionSuggestion,
  TippySuggestion,
  WelshmanExtension,
  editorProps,
} from "@welshman/editor"
import {escapeHtml} from "@lib/html"
import {makeMentionNodeView} from "@app/editor/MentionNodeView"
import ProfileSuggestion from "@app/editor/ProfileSuggestion.svelte"
import {RoomReferenceExtension} from "@app/editor/RoomReferenceExtension"
import RoomSuggestion from "@app/editor/RoomSuggestion.svelte"
import {NativeClipboardPasteExtension} from "@app/editor/clipboard"
import {uploadFile} from "@app/uploads"
import {deriveSpaceMembers} from "@app/members"
import {makeRoomId, splitRoomId, userSpaceUrls, roomsByUrl} from "@app/groups"
import {pushToast} from "@app/toast"

export const makeEditor = async ({
  encryptFiles = false,
  aggressive = false,
  charCount,
  content = "",
  onChange,
  placeholder = "",
  url,
  submit,
  uploading,
  wordCount,
}: {
  encryptFiles?: boolean
  aggressive?: boolean
  charCount?: Writable<number>
  content?: string | object
  onChange?: (json: object) => void
  placeholder?: string
  url?: string
  submit: () => void
  uploading?: Writable<boolean>
  wordCount?: Writable<number>
}) => {
  const profileSearch = derived(
    [
      throttled(800, profiles),
      throttled(800, handlesByNip05),
      throttled(800, deriveSpaceMembers(url || "")),
    ],
    ([$profiles, $handlesByNip05, $spaceMembers]) => {
      // Remove invalid nip05's from profiles
      const options = $profiles.map(p => {
        const isNip05Valid = !p.nip05 || $handlesByNip05.get(p.nip05)?.pubkey === p.event.pubkey

        return isNip05Valid ? p : {...p, nip05: ""}
      })

      return createSearch(options, {
        onSearch: searchProfiles,
        getValue: (profile: PublishedProfile) => profile.event.pubkey,
        sortFn: ({score = 1, item}) => {
          const wotScore = getWotGraph().get(item.event.pubkey) || 0
          const membershipScale = $spaceMembers?.includes(item.event.pubkey) ? 2 : 1

          return dec(score) * inc(wotScore / getMaxWot()) * membershipScale
        },
        fuseOptions: {
          keys: [
            "nip05",
            {name: "name", weight: 0.8},
            {name: "display_name", weight: 0.5},
            {name: "about", weight: 0.3},
          ],
          threshold: 0.3,
          shouldSort: false,
        },
      })
    },
  )

  const roomReferenceSearch = derived(
    [throttled(800, userSpaceUrls), throttled(800, roomsByUrl)],
    ([$userSpaceUrls, $roomsByUrl]) => {
      const roomIdByMeta = new WeakMap<RoomMeta, string>()
      const options: RoomMeta[] = []

      for (const roomUrl of $userSpaceUrls) {
        for (const room of $roomsByUrl.get(roomUrl) || []) {
          roomIdByMeta.set(room, makeRoomId(roomUrl, room.h))
          options.push(room)
        }
      }

      return createSearch(options, {
        getValue: item => roomIdByMeta.get(item) || item.h,
        fuseOptions: {
          keys: ["name", "h"],
          threshold: 0.3,
          shouldSort: false,
        },
      })
    },
  )

  const ed = new Editor({
    content: typeof content === "string" ? escapeHtml(content) : content,
    editorProps,
    element: document.createElement("div"),
    extensions: [
      RoomReferenceExtension,
      WelshmanExtension.configure({
        submit,
        extensions: {
          placeholder: {
            config: {
              placeholder,
            },
          },
          breakOrSubmit: {
            config: {
              aggressive,
            },
          },
          fileUpload: {
            config: {
              upload: (attrs: FileAttributes) =>
                uploadFile(attrs.file, {url, encrypt: encryptFiles}),
              onDrop: () => uploading?.set(true),
              onComplete: () => uploading?.set(false),
              onUploadError(currentEditor, task) {
                currentEditor.commands.removeFailedUploads()
                pushToast({theme: "error", message: task.error})
                uploading?.set(false)
              },
            },
          },
          nprofile: {
            extend: {
              addNodeView: () => makeMentionNodeView(url),
              addProseMirrorPlugins() {
                return [
                  MentionSuggestion({
                    editor: (this as any).editor,
                    search: (term: string) => get(profileSearch).searchValues(term),
                    getRelays: (pubkey: string) => Router.get().FromPubkeys([pubkey]).getUrls(),
                    updateSignal: profileSearch,
                    createSuggestion: (value: string) => {
                      const target = document.createElement("div")

                      mount(ProfileSuggestion, {target, props: {value, url}})

                      return target
                    },
                  }),
                  TippySuggestion({
                    char: "~",
                    name: "roomref",
                    editor: (this as any).editor,
                    search: (term: string) => get(roomReferenceSearch).searchValues(term),
                    updateSignal: roomReferenceSearch,
                    select: (id: string, props) => {
                      const [roomUrl, h] = splitRoomId(id)

                      if (!roomUrl || !h) {
                        return
                      }

                      return props.command({url: roomUrl, h})
                    },
                    createSuggestion: (value: string) => {
                      const target = document.createElement("div")

                      mount(RoomSuggestion, {target, props: {value}})

                      return target
                    },
                  }),
                ]
              },
            },
          },
        },
      }),
      NativeClipboardPasteExtension,
    ],
    onUpdate({editor}) {
      wordCount?.set(editor.storage.wordCount.words)
      charCount?.set(editor.storage.wordCount.chars)
      onChange?.(editor.getJSON())
    },
  })

  return ed
}
