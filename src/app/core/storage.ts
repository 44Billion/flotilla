import {call} from "@welshman/lib"
import {Preferences} from "@capacitor/preferences"
import {IDB} from "@lib/indexeddb"

export const kv = call(() => {
  let p = Promise.resolve()

  const get = async <T>(key: string): Promise<T | undefined> => {
    const result = await Preferences.get({key})
    if (!result.value) return undefined
    try {
      return JSON.parse(result.value)
    } catch (e) {
      return undefined
    }
  }

  const set = async <T>(key: string, value: T): Promise<void> => {
    p = p.then(() => Preferences.set({key, value: JSON.stringify(value)}))

    await p
  }

  const clear = async () => {
    p = p.then(() => Preferences.clear())

    await p
  }

  return {get, set, clear}
})

export const db = new IDB({
  name: "flotilla-9gl",
  version: 1,
  stores: [
    {name: "events", keyPath: "id"},
    {name: "tracker", keyPath: "id"},
    {name: "relays", keyPath: "url"},
    {name: "relayStats", keyPath: "url"},
    {name: "handles", keyPath: "nip05"},
    {name: "zappers", keyPath: "lnurl"},
    {name: "plaintext", keyPath: "key"},
    {name: "wrapManager", keyPath: "id"},
  ],
})
