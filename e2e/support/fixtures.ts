import type {SignedEvent} from "@welshman/util"
import type {RelayMockConfig} from "../../src/lib/test/relayMocks"

import relay1Events from "./fixtures/relay1.json"

// Fake relay urls used by tests. Each maps to a json fixture under ./fixtures/ and an entry in
// EVENTS_BY_RELAY below. To add a relay: drop a `<name>.json` file in ./fixtures/, import it, add a
// url here, and wire it into EVENTS_BY_RELAY.
export const FIXTURE_RELAYS = {
  relay1: "wss://relay1.test/",
} as const

// The events each fake relay serves. The json files hold static, pre-signed events: schnorr
// signatures are non-deterministic, so events are signed once and committed verbatim (they pass
// verifyEvent, which netContext.isEventValid enforces). Regenerate with @welshman/signer:
//   await Nip01Signer.fromSecret(secret).sign(makeEvent(kind, {content, created_at}))
const EVENTS_BY_RELAY: Record<string, SignedEvent[]> = {
  [FIXTURE_RELAYS.relay1]: relay1Events as SignedEvent[],
}

// Build a RelayMockConfig populating the given fixture relays (all of them when none are passed).
// Any relay not included returns nothing, keeping tests offline.
export const relayFixtures = (...urls: string[]): RelayMockConfig => {
  const selected = urls.length > 0 ? urls : Object.keys(EVENTS_BY_RELAY)

  return {
    relays: Object.fromEntries(selected.map(url => [url, EVENTS_BY_RELAY[url] ?? []])),
  }
}
