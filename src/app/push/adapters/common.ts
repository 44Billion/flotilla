import {withGetter} from "@welshman/store"
import {writable} from "svelte/store"
import {goto} from "$app/navigation"
import type {Subscriber, Unsubscriber} from "svelte/store"
import {
  PushNotifications,
  type ActionPerformed,
  type RegistrationError,
  type Token,
} from "@capacitor/push-notifications"
import type {PluginListenerHandle} from "@capacitor/core"
import {pubkey, repository, tracker, userMessagingRelayList} from "@welshman/app"
import {merged} from "@welshman/store"
import {assoc, call, now, on, poll, spec, throttle} from "@welshman/lib"
import {load, LOCAL_RELAY_URL} from "@welshman/net"
import type {RepositoryUpdate} from "@welshman/net"
import {
  getIdFilters,
  getRelaysFromList,
  getTagValue,
  matchFilters,
  MESSAGE,
  type Filter,
  type TrustedEvent,
} from "@welshman/util"
import {DM_KINDS, CONTENT_KINDS, makeCommentFilter} from "@app/content"
import {notificationSettings, shouldNotify, userSettingsValues} from "@app/settings"
import {userSpaceUrls} from "@app/groups"
import {makeSpacePath, getEventPath} from "@app/routes"

export type PushSubscription = {
  key: string
  callback: string
}

export type PushState = {
  token?: string
  useFallback?: boolean
  subscription?: PushSubscription
}

export const pushState = withGetter(writable<PushState>({}))

export interface IPushAdapter {
  request: (prompt?: boolean) => Promise<string>
  disable: () => Promise<void>
  enable: () => Promise<void>
}

export type PushPermissionResult = {
  token?: string
  error?: string
}

export const onNotification = call(() => {
  const allFilters = [
    {kinds: [MESSAGE, ...CONTENT_KINDS, ...DM_KINDS]},
    makeCommentFilter(CONTENT_KINDS),
  ]
  const filters = allFilters.map(assoc("since", now()))
  const subscribers: Subscriber<TrustedEvent>[] = []

  let unsubscribe: Unsubscriber | undefined

  return (f: (event: TrustedEvent) => void) => {
    subscribers.push(f)

    if (!unsubscribe) {
      unsubscribe = on(repository, "update", ({added}: RepositoryUpdate) => {
        const $pubkey = pubkey.get()

        for (const event of added) {
          if (event.pubkey == $pubkey) {
            continue
          }

          const h = getTagValue("h", event.tags)

          if (Array.from(tracker.getRelays(event.id)).every(url => !shouldNotify(url, h))) {
            continue
          }

          if (matchFilters(filters, event)) {
            for (const f of subscribers) {
              f(event)
            }
          }
        }
      })
    }

    return () => {
      subscribers.splice(subscribers.indexOf(f), 1)

      if (subscribers.length === 0) {
        unsubscribe?.()
        unsubscribe = undefined
      }
    }
  }
})

export const onPushNotificationAction = async (action: ActionPerformed) => {
  const {relay, id} = action.notification.data

  const [event] = await load({
    relays: [relay, LOCAL_RELAY_URL],
    filters: getIdFilters([id]),
  })

  if (event) {
    goto(await getEventPath(event, [relay]))
  } else {
    goto(makeSpacePath(relay))
  }
}

export const requestPermissions = async (): Promise<string> => {
  let status = await PushNotifications.checkPermissions()

  if (["prompt", "prompt-with-rationale"].includes(status.receive)) {
    status = await PushNotifications.requestPermissions()
  }

  return status.receive
}

export const requestToken = async (): Promise<PushPermissionResult> => {
  let {token} = pushState.get()
  let error = "failed to retrieve token"

  if (!token) {
    const listeners = [
      PushNotifications.addListener("registration", ({value}: Token) => {
        token = value
      }),
      PushNotifications.addListener("registrationError", (err: RegistrationError) => {
        error = err.error
      }),
    ]

    await Promise.all([
      PushNotifications.register(),
      poll({
        condition: () => Boolean(token),
        signal: AbortSignal.timeout(5000),
      }),
    ])

    listeners.forEach(p => p.then((listener: PluginListenerHandle) => listener.remove()))
  }

  return token ? {token} : {error}
}

export const syncRelaySubscriptions = (
  signal: AbortSignal,
  sync: (url: string, key: string, filters: Filter[], ignore: Filter[]) => void,
) => {
  const $pubkey = pubkey.get()

  if (!$pubkey) {
    throw new Error("Attempted to sync push subscriptions without an active pubkey")
  }

  const unsubscribeSpaces = merged([
    userSpaceUrls,
    notificationSettings,
    userSettingsValues,
  ]).subscribe(
    throttle(3000, ([$userSpaceUrls, {spaces, mentions}, {alerts}]) => {
      const baseFilters = [{kinds: [MESSAGE, ...CONTENT_KINDS]}, makeCommentFilter(CONTENT_KINDS)]

      for (const url of $userSpaceUrls) {
        const {notify = true, exceptions = []} = alerts.find(spec({url})) || {}
        const filters: Filter[] = []
        const ignore: Filter[] = []

        if (spaces) {
          if (notify) {
            if (exceptions.length > 0) {
              ignore.push({"#h": exceptions})
            }
            filters.push(...baseFilters)
          } else {
            if (exceptions.length > 0) {
              filters.push(...baseFilters.map(f => ({...f, "#h": exceptions})))
            }
          }
        }

        if (mentions) {
          filters.push(...baseFilters.map(f => ({...f, "#p": [$pubkey]})))
        }

        sync(url, "spaces", filters, ignore)
      }
    }),
  )

  const unsubscribeMessages = merged([userMessagingRelayList, notificationSettings]).subscribe(
    throttle(3000, ([$userMessagingRelayList, {messages}]) => {
      for (const url of getRelaysFromList($userMessagingRelayList)) {
        const filters: Filter[] = []

        if (messages) {
          filters.push({kinds: DM_KINDS, "#p": [$pubkey]})
        }

        sync(url, "messages", filters, [])
      }
    }),
  )

  signal.addEventListener("abort", () => {
    unsubscribeSpaces()
    unsubscribeMessages()
  })
}
