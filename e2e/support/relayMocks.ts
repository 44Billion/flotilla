import type {Page} from "@playwright/test"
import type {RelayMockConfig} from "../../src/lib/test/relayMocks"

// Must match RELAY_MOCKS_KEY in src/lib/test/relayMocks.ts.
const RELAY_MOCKS_KEY = "__RELAY_MOCKS__"

// Hard safety net: intercept every real websocket so a test can never reach the network, even if
// some code path opens a socket directly (e.g. relay AUTH) rather than going through the adapter
// layer. We never call route.connectToServer(), so the socket connects to Playwright's in-process
// mock and simply receives nothing.
export const blockWebsockets = (page: Page) => page.routeWebSocket(/^wss?:\/\//, () => {})

// Inject the relay-mock config the app reads on startup. addInitScript runs before any page script
// on every navigation, so this must be called before page.goto().
export const injectRelayConfig = (page: Page, config: RelayMockConfig) =>
  page.addInitScript(
    ([key, value]) => {
      Object.assign(window, {[key]: value})
    },
    [RELAY_MOCKS_KEY, config] as const,
  )

// Full network isolation plus optional fixtures, in one call. With no config, every relay returns
// nothing (requirement 1). Pass {relays: {url: events}} to populate specific relays (requirement 2).
export const setupRelayMocks = async (page: Page, config: RelayMockConfig = {}) => {
  await blockWebsockets(page)
  await injectRelayConfig(page, config)
}

export type {RelayMockConfig}
