import {get, writable} from "svelte/store"
import type {Nip46ResponseWithResult} from "@welshman/signer"
import {Nip46Broker} from "@welshman/signer"
import {makeSecret} from "@welshman/util"
import {
  PLATFORM_URL,
  PLATFORM_NAME,
  PLATFORM_LOGO,
  SIGNER_RELAYS,
  NIP46_PERMS,
} from "@app/core/state"
import {pushToast} from "@app/toast"

const APP_SCHEME = "social.flotilla"

const makeSignerCallbackUrl = (path: string) => `${APP_SCHEME}://x-callback-url/${path}`

const makeSignerLaunchUrl = (nostrconnectUrl: string) => {
  const params = new URLSearchParams({
    method: "connect",
    nostrconnect: nostrconnectUrl,
    "x-source": APP_SCHEME,
    "x-success": makeSignerCallbackUrl("authSuccess"),
    "x-error": makeSignerCallbackUrl("authError"),
  })

  return `nostrsigner://x-callback-url/auth/nip46?${params.toString()}`
}

export class Nip46Controller {
  url = writable("")
  bunker = writable("")
  loading = writable(false)
  clientSecret = makeSecret()
  abortController = new AbortController()
  broker = new Nip46Broker({clientSecret: this.clientSecret, relays: SIGNER_RELAYS})
  onNostrConnect: (response: Nip46ResponseWithResult) => void

  constructor({onNostrConnect}: {onNostrConnect: (response: Nip46ResponseWithResult) => void}) {
    this.onNostrConnect = onNostrConnect
  }

  async start() {
    const url = await this.broker.makeNostrconnectUrl({
      url: PLATFORM_URL,
      name: PLATFORM_NAME,
      image: PLATFORM_LOGO,
      perms: NIP46_PERMS,
    })

    this.url.set(url)

    let response
    try {
      response = await this.broker.waitForNostrconnect(url, this.abortController.signal)
    } catch (errorResponse: any) {
      if (errorResponse?.error) {
        pushToast({
          theme: "error",
          message: `Received error from signer: ${errorResponse.error}`,
        })
      } else if (errorResponse) {
        console.error(errorResponse)
      }
    }

    if (response) {
      this.loading.set(true)
      this.onNostrConnect(response)
    }
  }

  launchSigner() {
    const nostrconnectUrl = get(this.url)
    const signerUrl = nostrconnectUrl && makeSignerLaunchUrl(nostrconnectUrl)

    if (!signerUrl) {
      pushToast({
        theme: "error",
        message: "Unable to open signer app right now. Please try again.",
      })

      return
    }

    window.location.href = signerUrl
  }

  stop() {
    this.broker.cleanup()
    this.abortController.abort()
  }
}
