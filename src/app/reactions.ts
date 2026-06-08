import type {TrustedEvent} from "@welshman/util"
import {REACTION, getTag, makeEvent} from "@welshman/util"
import {publishThunk, tagEventForReaction} from "@welshman/app"
import {PROTECTED} from "@app/groups"

export type ReactionParams = {
  protect: boolean
  event: TrustedEvent
  content: string
  url?: string
  tags?: string[][]
}

export const makeReaction = ({
  url,
  protect,
  content,
  event,
  tags: paramTags = [],
}: ReactionParams) => {
  const tags = [...paramTags, ...tagEventForReaction(event, url)]
  const groupTag = getTag("h", event.tags)

  if (groupTag) {
    tags.push(groupTag)
  }

  if (protect) {
    tags.push(PROTECTED)
  }

  return makeEvent(REACTION, {content, tags})
}

export const publishReaction = ({relays, ...params}: ReactionParams & {relays: string[]}) => {
  publishThunk({event: makeReaction({url: relays[0], ...params}), relays})
}
