import {APP_DATA, makeEvent} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {deriveItemsByKey, getter, makeLoadItem, withGetter} from "@welshman/store"
import {
  ensurePlaintext,
  makeOutboxLoader,
  makeUserData,
  makeUserLoader,
  publishThunk,
  pubkey,
  repository,
  signer,
} from "@welshman/app"
import {append, parseJson, remove, spec} from "@welshman/lib"
import {derived, get, writable} from "svelte/store"
import {Router} from "@welshman/router"
export const SETTINGS = "flotilla/settings"

export enum RelayAuthMode {
  Aggressive = "aggressive",
  Conservative = "conservative",
}

export type SpaceNotificationSettings = {
  url: string
  notify: boolean
  exceptions: string[]
}

export type SettingsValues = {
  show_media: boolean
  hide_sensitive: boolean
  trusted_relays: string[]
  report_usage: boolean
  report_errors: boolean
  relay_auth: RelayAuthMode
  send_delay: number
  font_size: number
  alerts: SpaceNotificationSettings[]
  zap_amounts: number[]
}

export type Settings = {
  event: TrustedEvent
  values: SettingsValues
}

export const defaultSettings: SettingsValues = {
  show_media: true,
  hide_sensitive: true,
  trusted_relays: [],
  report_usage: true,
  report_errors: true,
  relay_auth: RelayAuthMode.Conservative,
  send_delay: 0,
  font_size: 1.1,
  alerts: [],
  zap_amounts: [21, 210, 2100, 21000],
}

export const settingsByPubkey = deriveItemsByKey({
  repository,
  getKey: settings => settings.event.pubkey,
  filters: [{kinds: [APP_DATA], "#d": [SETTINGS]}],
  eventToItem: async (event: TrustedEvent) => {
    const values = {...defaultSettings, ...parseJson(await ensurePlaintext(event))}

    return {event, values}
  },
})

export const getSettingsByPubkey = getter(settingsByPubkey)

export const loadSettings = makeLoadItem(
  makeOutboxLoader(APP_DATA, {"#d": [SETTINGS]}),
  (pubkey: string) => getSettingsByPubkey().get(pubkey),
)

export const userSettings = makeUserData(settingsByPubkey, loadSettings)

export const loadUserSettings = makeUserLoader(loadSettings)

export const userSettingsValues = derived(userSettings, $s => $s?.values || defaultSettings)

export const zapAmounts = derived(userSettingsValues, $settings => $settings.zap_amounts)

export const getSettings = getter(userSettingsValues)

export const getSetting = <T>(key: keyof Settings["values"]) => getSettings()[key] as T

export const getShouldNotify = ({alerts}: SettingsValues, url: string, h?: string) => {
  const pref = alerts.find(spec({url}))

  if (!pref) return true
  if (!h) return pref.notify
  if (pref.notify) return !pref.exceptions.includes(h)
  if (!pref.notify) return pref.exceptions.includes(h)
}

export const shouldNotify = (url: string, h?: string) => getShouldNotify(getSettings(), url, h)

export const deriveShouldNotify = (url: string, h?: string) =>
  derived(userSettingsValues, $settings => getShouldNotify($settings, url, h))

export const notificationSettings = withGetter(
  writable({
    push: false,
    sound: true,
    badge: false,
    spaces: true,
    mentions: true,
    messages: true,
  }),
)

export const makeSettings = async (params: Partial<SettingsValues>) => {
  const json = JSON.stringify({...get(userSettingsValues), ...params})
  const content = await signer.get().nip44.encrypt(pubkey.get()!, json)
  const tags = [["d", SETTINGS]]

  return makeEvent(APP_DATA, {content, tags})
}

export const publishSettings = async (params: Partial<SettingsValues>) =>
  publishThunk({event: await makeSettings(params), relays: Router.get().FromUser().getUrls()})

export const addTrustedRelay = async (url: string) =>
  publishSettings({trusted_relays: append(url, getSetting<string[]>("trusted_relays"))})

export const removeTrustedRelay = async (url: string) =>
  publishSettings({trusted_relays: remove(url, getSetting<string[]>("trusted_relays"))})

export const setSpaceNotifications = async (url: string, notify: boolean) => {
  const {alerts} = getSettings()
  const existing = alerts.find((s: SpaceNotificationSettings) => s.url === url)

  let updated: typeof alerts

  if (existing) {
    updated = alerts.map((s: SpaceNotificationSettings) =>
      s.url === url ? {...s, notify, exceptions: []} : s,
    )
  } else {
    updated = [...alerts, {url, notify, exceptions: []}]
  }

  return publishSettings({alerts: updated})
}

export const toggleRoomNotifications = async (url: string, h: string) => {
  const {alerts} = getSettings()
  const existing = alerts.find((s: SpaceNotificationSettings) => s.url === url)

  let updated: typeof alerts

  if (!existing) {
    updated = [...alerts, {url, notify: true, exceptions: [h]}]
  } else {
    const exceptions = existing.exceptions.includes(h)
      ? remove(h, existing.exceptions)
      : append(h, existing.exceptions)

    updated = alerts.map((s: SpaceNotificationSettings) => (s.url === url ? {...s, exceptions} : s))
  }

  return publishSettings({alerts: updated})
}
