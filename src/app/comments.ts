import type {TrustedEvent} from "@welshman/util"
import {COMMENT, makeEvent} from "@welshman/util"
import {publishThunk, tagEventForComment} from "@welshman/app"

export type CommentParams = {
  event: TrustedEvent
  content: string
  tags?: string[][]
  url?: string
}

export const makeComment = ({url, event, content, tags = []}: CommentParams) =>
  makeEvent(COMMENT, {content, tags: [...tags, ...tagEventForComment(event, url)]})

export const publishComment = ({relays, ...params}: CommentParams & {relays: string[]}) =>
  publishThunk({event: makeComment({url: relays[0], ...params}), relays})
