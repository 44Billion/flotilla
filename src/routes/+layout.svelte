<script lang="ts">
  import "@src/app.css"
  import "@welshman/editor/index.css"
  import * as nip19 from "nostr-tools/nip19"
  import type {Unsubscriber} from "svelte/store"
  import {get} from "svelte/store"
  import {App, type URLOpenListenerEvent} from "@capacitor/app"
  import {dev} from "$app/environment"
  import {goto} from "$app/navigation"
  import {page} from "$app/stores"
  import {sync, throttled} from "@welshman/store"
  import {always, call} from "@welshman/lib"
  import {defaultSocketPolicies, netContext} from "@welshman/net"
  import {appContext, pubkey, sessions, signerLog, shouldUnwrap} from "@welshman/app"
  import {routerContext} from "@welshman/router"
  import {verifyEvent} from "@welshman/util"
  import type {TrustedEvent} from "@welshman/util"
  import {context as pomadeContext} from "@pomade/core"
  import * as lib from "@welshman/lib"
  import * as util from "@welshman/util"
  import * as feeds from "@welshman/feeds"
  import * as router from "@welshman/router"
  import * as store from "@welshman/store"
  import * as welshmanSigner from "@welshman/signer"
  import * as net from "@welshman/net"
  import * as app from "@welshman/app"
  import {isMobile} from "@lib/html"
  import * as implicit from "@lib/implicit"
  import {maybeInstallRelayMocks} from "@lib/test/relayMocks"
  import AppContainer from "@app/components/AppContainer.svelte"
  import ModalContainer from "@app/components/ModalContainer.svelte"
  import {setupHistory} from "@app/routes"
  import {setupAnalytics} from "@app/analytics"
  import {authPolicy, blockPolicy, trustPolicy, mostlyRestrictedPolicy} from "@app/policies"
  import {db, kv, ss} from "@app/storage"
  import {device} from "@app/device"
  import {getSetting, userSettingsValues, notificationSettings} from "@app/settings"
  import {DUFFLEPUD_URL, INDEXER_RELAYS, POMADE_SIGNERS} from "@app/env"
  import {pushState} from "@app/push/adapters/common"
  import {syncApplicationData} from "@app/sync"
  import * as groups from "@app/groups"
  import * as comments from "@app/comments"
  import * as deletes from "@app/deletes"
  import * as reactions from "@app/reactions"
  import * as profiles from "@app/profiles"
  import * as lightning from "@app/lightning"
  import * as uploads from "@app/uploads"
  import * as appPolls from "@app/polls"
  import * as reports from "@app/reports"
  import * as relays from "@app/relays"
  import * as settings from "@app/settings"
  import * as members from "@app/members"
  import * as chats from "@app/chats"
  import * as content from "@app/content"
  import * as env from "@app/env"
  import * as repository from "@app/repository"
  import * as social from "@app/social"
  import * as appDevice from "@app/device"
  import * as actionItems from "@app/actionItems"
  import * as appFeeds from "@app/feeds"
  import * as invites from "@app/invites"
  import * as healthChecks from "@app/healthChecks"
  import {theme} from "@app/theme"
  import {toast, pushToast} from "@app/toast"
  import * as notifications from "@app/notifications"
  import {Push} from "@app/push"
  import {onPushNotificationAction} from "@app/push/adapters/common"
  import * as storage from "@app/storage"
  import {syncKeyboard} from "@app/keyboard"
  import {getPageTitle} from "@app/title"
  import NewNotificationSound from "@src/app/components/NewNotificationSound.svelte"

  const {children} = $props()

  // Test-only: when Playwright has injected window.__RELAY_MOCKS__, serve relays from in-memory
  // fixtures instead of the network. No-op for real users; stripped from production builds.
  if (import.meta.env.DEV) {
    maybeInstallRelayMocks()
  }

  const policies = [authPolicy, blockPolicy, trustPolicy, mostlyRestrictedPolicy]

  // Add stuff to window for convenience
  Object.assign(window, {
    get,
    nip19,
    theme,
    ...lib,
    ...implicit,
    ...welshmanSigner,
    ...router,
    ...store,
    ...util,
    ...feeds,
    ...net,
    ...app,
    ...groups,
    ...relays,
    ...settings,
    ...members,
    ...chats,
    ...content,
    ...env,
    ...repository,
    ...social,
    ...appDevice,
    ...actionItems,
    ...appFeeds,
    ...invites,
    ...healthChecks,
    ...comments,
    ...deletes,
    ...reactions,
    ...profiles,
    ...lightning,
    ...uploads,
    ...appPolls,
    ...reports,
    ...notifications,
  })

  // Set up context for various modules
  pomadeContext.setSignerUrls(POMADE_SIGNERS)
  pomadeContext.setArgonWorker(import("@pomade/core/argon-worker.js?worker"))
  appContext.dufflepudUrl = DUFFLEPUD_URL
  routerContext.getIndexerRelays = always(INDEXER_RELAYS)
  netContext.isEventValid = (event: TrustedEvent, url: string) =>
    getSetting<string[]>("trusted_relays").includes(url) || verifyEvent(event)

  // Listen for deep link events
  App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    const url = new URL(event.url)
    const relay = url.searchParams.get("relay")
    const id = url.searchParams.get("id")

    if (relay && id) {
      onPushNotificationAction({notification: {data: {relay, id}}} as any)
      return
    }

    if (url.host === "x-callback-url") {
      if (url.pathname === "/authError") {
        const errorMessage = url.searchParams.get("errorMessage")

        pushToast({
          theme: "error",
          message: errorMessage || "Signer authorization failed.",
        })
      }

      if (["/authSuccess", "/authError"].includes(url.pathname)) {
        return
      }
    }

    const target = `${url.pathname}${url.search}${url.hash}`
    goto(target, {replaceState: false, noScroll: false})
  })

  // Handle back button on mobile
  App.addListener("backButton", () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      App.exitApp()
    }
  })

  // Cleanup on page close
  window.addEventListener("beforeunload", () => db.close())

  const unsubscribe = call(async () => {
    const unsubscribers: Unsubscriber[] = []

    // Sync stuff to storage
    await Promise.all([
      sync({
        key: "device",
        store: device,
        storage: kv,
      }),
      sync({
        key: "pubkey",
        store: pubkey,
        storage: kv,
      }),
      sync({
        key: "sessions",
        store: sessions,
        storage: ss,
      }),
      sync({
        key: "shouldUnwrap",
        store: shouldUnwrap,
        storage: kv,
      }),
      sync({
        key: "notificationSettings",
        store: notificationSettings,
        storage: kv,
      }),
      sync({
        key: "notificationState",
        store: pushState,
        storage: kv,
      }),
    ])

    const storageSync = storage.sync()

    unsubscribers.push(storageSync.unsubscribe)

    // Wait for critical storage data only
    await storageSync.ready

    // Close the database connection on reload
    unsubscribers.push(() => db.close())

    // Add our extra policies now that we're set up
    defaultSocketPolicies.push(...policies)

    // Remove policies when we're done
    unsubscribers.push(() => defaultSocketPolicies.splice(-policies.length))

    // History, navigation, application data
    unsubscribers.push(setupHistory(), setupAnalytics(), syncApplicationData())

    // Initialize keyboard state tracking
    unsubscribers.push(syncKeyboard())

    // Subscribe to badge count for changes
    unsubscribers.push(notifications.syncBadges())

    // Subscribe to page history to update checked state
    unsubscribers.push(notifications.syncChecked())

    // Sync checked state across devices
    unsubscribers.push(notifications.syncCheckedRemote())

    // Initialize background notifications
    unsubscribers.push(Push.sync())

    // Listen for signer errors, report to user via toast
    unsubscribers.push(
      throttled(10_000, signerLog).subscribe($log => {
        if ($toast) return

        const longCutoff = Date.now() - 30_000
        const shortCutoff = Date.now() - 10_000
        const pending = $log.filter(x => !x.finished_at && x.started_at < longCutoff)
        const completed = $log.filter(x => x.finished_at && x.finished_at > shortCutoff)
        const showPendingError = pending.length > 10
        const showCompletedError = completed.length > 5 && completed.filter(x => x.ok).length === 0

        if (showPendingError || showCompletedError) {
          pushToast({
            theme: "error",
            timeout: 60_000,
            message: "Your signer isn't responding.",
            action: {
              message: "Details",
              onclick: () => goto("/settings/profile"),
            },
          })
        }
      }),
    )

    // Sync theme and font size
    unsubscribers.push(
      theme.subscribe($theme => {
        document.body.setAttribute("data-theme", $theme)
      }),
      userSettingsValues.subscribe($userSettingsValues => {
        // @ts-ignore
        document.documentElement.style["font-size"] = `${$userSettingsValues.font_size}rem`
      }),
    )

    return () => unsubscribers.forEach(call)
  })

  // Cleanup on hot reload
  import.meta.hot?.dispose(() => {
    App.removeAllListeners()
    unsubscribe.then(call)
  })

  $effect(() => {
    document.title = getPageTitle({page: $page, pubkey: $pubkey})
  })
</script>

<svelte:head>
  {#if !dev}
    <link rel="manifest" href="/manifest.webmanifest" />
  {/if}
</svelte:head>

{#await unsubscribe}
  <!-- pass -->
{:then}
  <div class={isMobile ? "mobile" : ""}>
    <AppContainer>
      {@render children()}
    </AppContainer>
    <ModalContainer />
    <div class="tippy-target"></div>
    <NewNotificationSound />
  </div>
{/await}
