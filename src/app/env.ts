import {normalizeRelayUrl} from "@welshman/util"
import {Capacitor} from "@capacitor/core"
import {Router} from "@welshman/router"
import * as nip19 from "nostr-tools/nip19"
import {identity} from "@welshman/lib"

const fromCsv = (s: string) => (s || "").split(",").filter(identity)

export const PUSH_SERVER = import.meta.env.VITE_PUSH_SERVER

export const PUSH_BRIDGE = normalizeRelayUrl(import.meta.env.VITE_PUSH_BRIDGE)

export const ENABLE_ZAPS = Capacitor.getPlatform() != "ios"

export const SIGNER_RELAYS = fromCsv(import.meta.env.VITE_SIGNER_RELAYS).map(normalizeRelayUrl)

export const BLOCKED_RELAYS = fromCsv(import.meta.env.VITE_BLOCKED_RELAYS).map(normalizeRelayUrl)

export const INDEXER_RELAYS = fromCsv(import.meta.env.VITE_INDEXER_RELAYS).map(normalizeRelayUrl)

export const DEFAULT_RELAYS = fromCsv(import.meta.env.VITE_DEFAULT_RELAYS).map(normalizeRelayUrl)

export const DEFAULT_MESSAGING_RELAYS = fromCsv(import.meta.env.VITE_DEFAULT_MESSAGING_RELAYS).map(
  normalizeRelayUrl,
)

export const PLATFORM_RELAYS = fromCsv(import.meta.env.VITE_PLATFORM_RELAYS).map(normalizeRelayUrl)

export const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL

export const PLATFORM_TERMS = import.meta.env.VITE_PLATFORM_TERMS

export const PLATFORM_PRIVACY = import.meta.env.VITE_PLATFORM_PRIVACY

export const PLATFORM_LOGO = import.meta.env.PROD
  ? PLATFORM_URL + "/logo.png"
  : import.meta.env.VITE_PLATFORM_LOGO.replace(/^static/, "") || PLATFORM_URL + "/logo.png"

export const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME

export const PLATFORM_ACCENT = import.meta.env.VITE_PLATFORM_ACCENT

export const PLATFORM_DESCRIPTION = import.meta.env.VITE_PLATFORM_DESCRIPTION

export const POMADE_SIGNERS = fromCsv(import.meta.env.VITE_POMADE_SIGNERS)

export const DEFAULT_BLOSSOM_SERVERS = fromCsv(import.meta.env.VITE_DEFAULT_BLOSSOM_SERVERS)

export const DEFAULT_PUBKEYS = import.meta.env.VITE_DEFAULT_PUBKEYS

export const DUFFLEPUD_URL = "https://dufflepud.onrender.com"

export const THUMBNAIL_URL = import.meta.env.VITE_THUMBNAIL_URL

export const dufflepud = (path: string) => DUFFLEPUD_URL + "/" + path

export const entityLink = (entity: string) => `https://coracle.social/${entity}`

export const pubkeyLink = (pubkey: string, relays = Router.get().FromPubkeys([pubkey]).getUrls()) =>
  entityLink(nip19.nprofileEncode({pubkey, relays}))
