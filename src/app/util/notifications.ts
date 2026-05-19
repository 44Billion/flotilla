import {derived, get, writable} from "svelte/store"
import {Badge} from "@capawesome/capacitor-badge"
import {synced, throttled, withGetter} from "@welshman/store"
import {pubkey, tracker, repository, relaysByUrl} from "@welshman/app"
import {assoc, prop, first, identity, groupBy, now} from "@welshman/lib"
import type {TrustedEvent} from "@welshman/util"
import {deriveEventsByIdByUrl} from "@welshman/store"
import {sortEventsDesc, getTagValue, MESSAGE} from "@welshman/util"
import {makeSpacePath, makeRoomPath, makeSpaceChatPath, makeChatPath} from "@app/util/routes"
import {
  CONTENT_KINDS,
  notificationSettings,
  chatsById,
  userGroupList,
  getSpaceUrlsFromGroupList,
  makeCommentFilter,
  hasNip29,
} from "@app/core/state"
import {kv} from "@app/core/storage"
import {page} from "$app/stores"
export {Push} from "@app/util/push"

// Checked state

export const checked = withGetter(
  synced<Record<string, number>>({
    key: "checked",
    defaultValue: {},
    storage: kv,
  }),
)

export const getChecked = (key: string) => checked.get()[key]

export const deriveChecked = (key: string) => derived(checked, prop<number>(key))

export const setChecked = (key: string) => checked.update(assoc(key, now()))

/** Room path while video call UI hides chat; checked + badge stay active until chat is shown. */
export const deferredRoomPath = writable<string | undefined>(undefined)

export const syncChecked = () => {
  let prev = ""

  const getPaths = (path: string) =>
    path
      .split("/")
      .map((_, i, segments) => segments.slice(0, i + 1).join("/"))
      .slice(1)

  return page.subscribe($page => {
    // Set checked when we leave a given page
    checked.update($checked => {
      for (const path of getPaths(prev)) {
        $checked[path] = now()
      }

      return $checked
    })

    // Set checked when we visit a given page - but delay it a tad
    setTimeout(() => {
      const defer = get(deferredRoomPath)

      checked.update($checked => {
        for (const path of getPaths($page.url.pathname)) {
          if (defer && path === defer) continue
          $checked[path] = now()
        }

        return $checked
      })
    }, 300)

    prev = $page.url.pathname
  })
}

// Derived notifications state

export const allNotifications = derived(
  throttled(
    1000,
    derived(
      [
        pubkey,
        checked,
        chatsById,
        relaysByUrl,
        userGroupList,
        deriveEventsByIdByUrl({
          tracker,
          repository,
          filters: [{kinds: [MESSAGE, ...CONTENT_KINDS]}, makeCommentFilter(CONTENT_KINDS)],
        }),
      ],
      identity,
    ),
  ),
  ([$pubkey, $checked, $chatsById, $relaysByUrl, $userGroupList, eventsByIdByUrl]) => {
    const hasNotification = (path: string, latestEvent?: TrustedEvent) => {
      if (!latestEvent || latestEvent.pubkey === $pubkey) {
        return false
      }

      for (const [entryPath, ts] of Object.entries($checked)) {
        const isMatch =
          entryPath === "*" ||
          entryPath.startsWith(path) ||
          (entryPath === "/chat/*" && path.startsWith("/chat/"))

        if (isMatch && ts > latestEvent.created_at) {
          return false
        }
      }

      return true
    }

    const paths = new Set<string>()

    for (const {pubkeys, messages} of $chatsById.values()) {
      const chatPath = makeChatPath(pubkeys)

      if (hasNotification(chatPath, messages[0])) {
        paths.add("/chat")
        paths.add(chatPath)
      }
    }

    for (const url of getSpaceUrlsFromGroupList($userGroupList)) {
      const spacePath = makeSpacePath(url)
      const events = sortEventsDesc((eventsByIdByUrl.get(url) || new Map()).values())

      if (hasNip29($relaysByUrl.get(url))) {
        for (const [h, [latestEvent]] of groupBy(e => getTagValue("h", e.tags), events)) {
          if (h) {
            const roomPath = makeRoomPath(url, h)

            if (hasNotification(roomPath, latestEvent)) {
              paths.add(spacePath)
              paths.add(roomPath)
            }
          }
        }
      } else {
        const messagesPath = makeSpaceChatPath(url)

        if (hasNotification(messagesPath, first(events))) {
          paths.add(spacePath)
          paths.add(messagesPath)
        }
      }
    }

    return paths
  },
)

export const notifications = derived(
  [page, allNotifications, deferredRoomPath],
  ([$page, $allNotifications, $deferredRoomPath]) =>
    new Set(
      [...$allNotifications].filter(p => {
        if (!$page.url.pathname.startsWith(p)) return true
        if ($deferredRoomPath && p === $deferredRoomPath) return true
        return false
      }),
    ),
)

// Badges

export const syncBadges = () =>
  derived([notifications, notificationSettings], identity).subscribe(
    async ([$notifications, $notificationSettings]) => {
      if ($notificationSettings.badge) {
        try {
          await Badge.set({count: $notifications.size})
        } catch (err) {
          // pass - firefox doesn't support badges
        }
      } else {
        await clearBadges()
      }
    },
  )

export const clearBadges = async () => {
  try {
    await Badge.clear()
  } catch (e) {
    // pass - firefox doesn't support this
  }
}
