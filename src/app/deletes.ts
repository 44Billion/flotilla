import type {TrustedEvent} from "@welshman/util"
import {DELETE, getTag, makeEvent} from "@welshman/util"
import {publishThunk, tagEvent} from "@welshman/app"
import {PROTECTED} from "@app/groups"

export type DeleteParams = {
  protect: boolean
  event: TrustedEvent
  tags?: string[][]
}

export const makeDelete = ({protect, event, tags = []}: DeleteParams) => {
  const thisTags = [["k", String(event.kind)], ...tagEvent(event), ...tags]
  const groupTag = getTag("h", event.tags)

  if (groupTag) {
    thisTags.push(groupTag)
  }

  if (protect) {
    thisTags.push(PROTECTED)
  }

  return makeEvent(DELETE, {tags: thisTags})
}

export const publishDelete = ({relays, ...params}: DeleteParams & {relays: string[]}) =>
  publishThunk({event: makeDelete(params), relays})
