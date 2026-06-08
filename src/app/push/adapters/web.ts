import {pubkey} from "@welshman/app"
import {maybe} from "@welshman/lib"
import type {Unsubscriber} from "svelte/store"
import {getPubkeyTagValues, matchFilter, type TrustedEvent} from "@welshman/util"
import {DM_KINDS, notificationSettings} from "@app/core/state"
import type {IPushAdapter} from "@app/push/adapters/common"
import {onNotification} from "@app/push/adapters/common"
import {goToEvent} from "@app/routes"

export class WebNotifications implements IPushAdapter {
  _unsubscriber = maybe<Unsubscriber>()

  async request(prompt = true) {
    if (prompt && Notification?.permission === "default") {
      await Notification.requestPermission()
    }

    return Notification?.permission || "denied"
  }

  _notify(event: TrustedEvent, title: string, body: string) {
    console.log("notify:", event)

    const notification = new Notification(title, {
      body,
      tag: event.id,
      icon: "/icon.png",
      badge: "/icon.png",
    })

    notification.onclick = () => {
      window.focus()
      goToEvent(event)
      notification.close()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        notification.close()
        document.removeEventListener("visibilitychange", onVisibilityChange)
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
  }

  async enable() {
    if (!this._unsubscriber) {
      this._unsubscriber = onNotification(event => {
        const {push, messages, mentions, spaces} = notificationSettings.get()

        if (push && document.hidden && Notification?.permission === "granted") {
          if (messages && matchFilter({kinds: DM_KINDS}, event)) {
            this._notify(event, "New direct message", "Someone sent you a direct message.")
          } else if (
            mentions &&
            event.pubkey !== pubkey.get() &&
            getPubkeyTagValues(event.tags).includes(pubkey.get()!)
          ) {
            this._notify(event, "Someone mentioned you", "Someone tagged you in a message.")
          } else if (spaces) {
            this._notify(event, "New activity", "Someone posted a new message.")
          }
        }
      })
    }
  }

  async disable() {
    this._unsubscriber?.()
    this._unsubscriber = undefined
  }
}
