import {get} from "svelte/store"
import {Capacitor} from "@capacitor/core"
import {PushNotifications} from "@capacitor/push-notifications"
import {
  pubkey,
  publishThunk,
  loadRelay,
  waitForThunkError,
  userMessagingRelayList,
} from "@welshman/app"
import {assoc, hash, maybe} from "@welshman/lib"
import type {Filter} from "@welshman/util"
import {DELETE, getRelaysFromList, makeEvent, Address} from "@welshman/util"
import {buildUrl} from "@lib/util"
import {PUSH_BRIDGE, PUSH_SERVER} from "@app/env"
import {pushState} from "@app/push/adapters/common"
import {userSpaceUrls} from "@app/groups"
import {device} from "@app/device"
import type {IPushAdapter} from "@app/push/adapters/common"
import {
  onPushNotificationAction,
  syncRelaySubscriptions,
  requestPermissions,
  requestToken,
} from "@app/push/adapters/common"

export class CapacitorNotifications implements IPushAdapter {
  _controller = maybe<AbortController>()

  async request() {
    const status = await requestPermissions()

    if (status !== "granted") {
      return status
    }

    const {token, error = "denied"} = await requestToken()

    pushState.update(assoc("token", token))

    return token ? "granted" : error
  }

  async _syncServer(signal: AbortSignal) {
    const {token, subscription} = pushState.get()

    if (!token) {
      throw new Error("Attempted to sync push server without a token")
    }

    if (!subscription) {
      try {
        const channel = Capacitor.getPlatform() === "ios" ? "apns" : "fcm"
        const url = buildUrl(PUSH_SERVER, "subscription", channel)
        const res = await fetch(url, {
          signal,
          method: "POST",
          body: JSON.stringify({token}),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          console.warn(`Failed to register with push server (status ${res.status})`)
        } else {
          const json = await res.json()

          if (json?.callback && json?.key) {
            pushState.update(assoc("subscription", json))
          } else {
            console.warn("Failed to register with push server (bad response)")
          }
        }
      } catch (e) {
        console.warn("Failed to register with push server:", e)
      }
    }
  }

  _getSubscriptionIdentifier = (relay: string, key: string) =>
    String(hash(relay + key + device.get()))

  _getPushUrl = async (url: string) => {
    for (const candidate of [url, PUSH_BRIDGE]) {
      const relay = await loadRelay(candidate)

      if (relay?.supported_nips?.map(String)?.includes("9a")) {
        return candidate
      }
    }
  }

  _syncRelay = async (relay: string, key: string, filters: Filter[], ignore: Filter[] = []) => {
    const {subscription} = pushState.get()

    if (!subscription) {
      console.warn(`Failed to subscribe ${relay} to notifications: no subscription`)
      return
    }

    const url = await this._getPushUrl(relay)

    if (!url) {
      console.warn(`Failed to subscribe ${relay} to notifications: unsupported`)
      return
    }

    const identifier = this._getSubscriptionIdentifier(relay, key)

    const thunk = publishThunk({
      relays: [url],
      event: makeEvent(30390, {
        tags: [
          ["d", identifier],
          ["relay", relay],
          ["callback", subscription.callback],
          ...ignore.map(filter => ["ignore", JSON.stringify(filter)]),
          ...filters.map(filter => ["filter", JSON.stringify(filter)]),
        ],
      }),
    })

    const error = await waitForThunkError(thunk)

    if (error) {
      console.warn(`Failed to subscribe ${relay} to ${key} notifications:`, error)
    }
  }

  _unsyncRelay = async (relay: string, key: string) => {
    const url = await this._getPushUrl(relay)

    if (!url) {
      console.warn(`Failed to unsubscribe ${relay} from notifications: unsupported`)
      return
    }

    const relays = [url]
    const identifier = this._getSubscriptionIdentifier(relay, key)
    const address = new Address(30390, pubkey.get()!, identifier).toString()
    const event = makeEvent(DELETE, {tags: [["a", address]]})
    const error = await waitForThunkError(publishThunk({relays, event}))

    if (error) {
      console.warn(`Failed to unsubscribe ${relay} from notifications:`, error)
    }
  }

  async enable() {
    if (!this._controller) {
      this._controller = new AbortController()

      PushNotifications.addListener("pushNotificationActionPerformed", onPushNotificationAction)

      this._controller.signal.addEventListener("abort", () => {
        PushNotifications.removeAllListeners()
      })

      try {
        await this._syncServer(this._controller.signal)

        syncRelaySubscriptions(this._controller.signal, (url, key, filters, ignore) => {
          if (filters.length > 0) {
            this._syncRelay(url, key, filters, ignore)
          } else {
            this._unsyncRelay(url, key)
          }
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  async disable() {
    this._controller?.abort()
    this._controller = undefined

    const {subscription} = pushState.get()

    if (subscription) {
      const res = await fetch(buildUrl(PUSH_SERVER, "subscription", subscription.key), {
        method: "delete",
      })

      if (!res.ok) {
        console.warn("Failed to delete push subscription")
      }
    }

    pushState.set({})

    await Promise.all(get(userSpaceUrls).map(url => this._unsyncRelay(url, "spaces")))

    await Promise.all(
      getRelaysFromList(get(userMessagingRelayList)).map(url => this._unsyncRelay(url, "messages")),
    )
  }
}
