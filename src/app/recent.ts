import {derived} from "svelte/store"
import {groupBy, first, sortBy, uniqBy, ago, MONTH} from "@welshman/lib"
import {MESSAGE, COMMENT, getTagValue, getTagValues, getIdAndAddress} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {repository} from "@welshman/app"
import {deriveEventsForUrl} from "@app/repository"
import {CONTENT_KINDS} from "@app/content"

export type RecentActivityItem = {
  type: "message" | "content"
  event: TrustedEvent
  count: number
  timestamp: number
}

// Recent activity for a space: latest message per room plus content with the
// most recent activity (post or comment), sorted newest first.
export const deriveRecentActivity = (url: string) => {
  const since = ago(3, MONTH)
  const messages = deriveEventsForUrl(url, [{kinds: [MESSAGE], since}])
  const content = deriveEventsForUrl(url, [{kinds: CONTENT_KINDS, since}])
  const comments = deriveEventsForUrl(url, [{kinds: [COMMENT], since}])

  return derived([messages, content, comments], ([$messages, $content, $comments]) => {
    const activity: RecentActivityItem[] = []

    const byRoom = groupBy(e => getTagValue("h", e.tags), $messages)
    for (const roomMessages of byRoom.values()) {
      const latest = first(roomMessages)
      if (latest) {
        activity.push({
          type: "message",
          event: latest,
          count: roomMessages.length,
          timestamp: latest.created_at,
        })
      }
    }

    const latestActivityByKey = new Map<string, number>()

    for (const event of $content) {
      for (const k of getIdAndAddress(event)) {
        latestActivityByKey.set(k, Math.max(latestActivityByKey.get(k) || 0, event.created_at))
      }
    }

    for (const event of $comments) {
      for (const k of getTagValues(["E", "A"], event.tags)) {
        latestActivityByKey.set(k, Math.max(latestActivityByKey.get(k) || 0, event.created_at))
      }
    }

    for (const [address, timestamp] of latestActivityByKey.entries()) {
      const event = repository.getEvent(address)

      if (event) {
        activity.push({type: "content", event, timestamp, count: 1})
      }
    }

    return sortBy(
      a => -a.timestamp,
      uniqBy(a => a.event.id, activity),
    )
  })
}
