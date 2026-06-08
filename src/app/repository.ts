import {
  deriveArray,
  deriveDeduplicated,
  deriveEventsAsc,
  deriveEventsById,
  deriveEventsByIdForUrl,
  deriveEventsDesc,
  getEventsByIdForUrl,
  makeDeriveEvent,
} from "@welshman/store"
import {deriveRelay, repository, tracker} from "@welshman/app"
import {sortEventsDesc} from "@welshman/util"
import type {Filter} from "@welshman/util"
import {load} from "@welshman/net"
import {first} from "@welshman/lib"
import {derived} from "svelte/store"
export const deriveEvent = makeDeriveEvent({
  repository,
  includeDeleted: true,
  onDerive: (filters: Filter[], relays: string[]) => load({filters, relays}),
})

export const deriveEvents = (filters: Filter[] = [{}]) =>
  deriveEventsDesc(deriveEventsById({repository, filters}))

export const getEventsForUrl = (url: string, filters: Filter[] = [{}]) =>
  getEventsByIdForUrl({url, tracker, repository, filters}).values()

export const deriveEventsForUrl = (url: string, filters: Filter[] = [{}]) =>
  deriveArray(deriveEventsByIdForUrl({url, tracker, repository, filters}))

export const deriveEventsForUrlAsc = (url: string, filters: Filter[] = [{}]) =>
  deriveEventsAsc(deriveEventsByIdForUrl({url, tracker, repository, filters}))

export const deriveEventsForUrlDesc = (url: string, filters: Filter[] = [{}]) =>
  deriveEventsDesc(deriveEventsByIdForUrl({url, tracker, repository, filters}))

export const deriveLatestEventForUrl = (url: string, filters: Filter[] = [{}]) =>
  deriveDeduplicated(deriveEventsByIdForUrl({url, tracker, repository, filters}), $eventsById =>
    first(sortEventsDesc($eventsById.values())),
  )

export const deriveRelaySignedEvents = (url: string, filters: Filter[] = [{}]) =>
  derived(
    [deriveRelay(url), deriveEventsForUrl(url, filters)],
    ([relay, events]) => events,
    // TODO: khatru doesn't support relay.self, uncomment when it's ready
    // filter(spec({pubkey: relay.self}), events)
  )
