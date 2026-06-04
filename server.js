import path from "node:path"
import {promises as fs} from "node:fs"
import {fileURLToPath} from "node:url"

import "dotenv/config"
import {serve} from "@hono/node-server"
import {serveStatic} from "@hono/node-server/serve-static"
import {loadRelay} from "@welshman/app"
import {displayRelayUrl, normalizeRelayUrl} from "@welshman/util"
import {load} from "cheerio"
import {Hono} from "hono"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BUILD_DIR = path.join(__dirname, "build")
const INDEX_PATH = path.join(BUILD_DIR, "index.html")

const PORT = parseInt(process.env.PORT || "", 10) || 3000
const HOST = process.env.HOST || "0.0.0.0"

let TEMPLATE_HTML = ""
try {
  TEMPLATE_HTML = await fs.readFile(INDEX_PATH, "utf8")
} catch (error) {
  console.error(`Unable to read ${INDEX_PATH}. Run "pnpm run build" first.`)
  process.exit(1)
}

const PLATFORM_NAME = process.env.VITE_PLATFORM_NAME
const PLATFORM_DESCRIPTION = process.env.VITE_PLATFORM_DESCRIPTION

// Match client-side decode logic
const decodeRelay = url => {
  try {
    return normalizeRelayUrl(decodeURIComponent(url))
  } catch {
    return undefined
  }
}

const requestUrlFromContext = context => {
  const requestUrl = new URL(context.req.url)
  const forwardedProto = context.req.header("x-forwarded-proto")?.split(",")[0]?.trim()
  const forwardedHost = context.req.header("x-forwarded-host")?.split(",")[0]?.trim()

  if (forwardedProto === "http" || forwardedProto === "https") {
    requestUrl.protocol = `${forwardedProto}:`
  }

  if (forwardedHost) {
    requestUrl.host = forwardedHost
  }

  return requestUrl
}

const fetchRelayMeta = async relayUrl => {
  if (!relayUrl) return undefined
  try {
    return await loadRelay(normalizeRelayUrl(relayUrl))
  } catch (err) {
    console.error(`Failed to fetch relay metadata for ${relayUrl}:`, err)
    return undefined
  }
}

const buildDefaultImage = requestUrl => {
  return new URL("/maskable-icon-512x512.png", requestUrl.origin).toString()
}

const getMetadataForInvite = async (url, match) => {
  const relayParam = url.searchParams.get("r")
  if (!relayParam) return undefined

  const relayMetadata = await fetchRelayMeta(relayParam)
  if (!relayMetadata) return undefined

  const relayDisplay = displayRelayUrl(relayParam)
  const spaceName = relayMetadata.name
  const relayDescription = relayMetadata.description

  const title = spaceName
    ? `Invite to ${spaceName} on ${PLATFORM_NAME}`
    : `Invite to a Space on ${PLATFORM_NAME}`

  const parts = []
  if (spaceName) {
    parts.push(`You are invited to join ${spaceName} on ${PLATFORM_NAME}.`)
  } else {
    parts.push(`You are invited to join a space on ${PLATFORM_NAME}.`)
  }

  if (relayDisplay) parts.push(`Relay: ${relayDisplay}.`)
  if (relayDescription) parts.push(relayDescription)
  else parts.push(PLATFORM_DESCRIPTION)

  const description = parts.join(" ")
  const image =
    relayMetadata.icon ||
    relayMetadata.picture ||
    relayMetadata.image ||
    buildDefaultImage(url)

  return {
    title,
    description,
    image,
    url: url.toString(),
    site: url.origin,
  }
}

const getMetadataForSpace = async (url, match) => {
  const relayParam = decodeRelay(match[1])
  if (!relayParam) return undefined

  const relayMetadata = await fetchRelayMeta(relayParam)
  if (!relayMetadata) return undefined

  const spaceName = relayMetadata.name || displayRelayUrl(relayParam)

  return {
    title: `${spaceName} on ${PLATFORM_NAME}`,
    description: relayMetadata.description || PLATFORM_DESCRIPTION,
    image:
      relayMetadata.icon ||
      relayMetadata.picture ||
      relayMetadata.image ||
      buildDefaultImage(url),
    url: url.toString(),
    site: url.origin,
  }
}

const getMetadataForSpaceSection = async (url, match) => {
  const spaceMeta = await getMetadataForSpace(url, match)
  if (!spaceMeta) return undefined

  const section = match[2]
  const sectionName = section.charAt(0).toUpperCase() + section.slice(1)
  spaceMeta.title = `${sectionName} on ${spaceMeta.title}`
  return spaceMeta
}

const getMetadataForSpaceItem = async (url, match) => {
  const spaceMeta = await getMetadataForSpace(url, match)
  if (!spaceMeta) return undefined

  const section = match[2]
  let itemType = "Item"
  if (section === "calendar") itemType = "Event"
  if (section === "threads") itemType = "Thread"
  if (section === "polls") itemType = "Poll"
  if (section === "goals") itemType = "Goal"
  if (section === "classifieds") itemType = "Listing"

  spaceMeta.title = `${itemType} on ${spaceMeta.title}`
  return spaceMeta
}

const getMetadataForRoom = async (url, match) => {
  const spaceMeta = await getMetadataForSpace(url, match)
  if (!spaceMeta) return undefined

  // Room metadata requires fetching from Nostr, which can be added later.
  spaceMeta.title = `Room on ${spaceMeta.title}`
  return spaceMeta
}

const routes = [
  [/^\/join\/?$/, getMetadataForInvite],
  [/^\/spaces\/([^/]+)\/(calendar|chat|threads|polls|goals|classifieds|recent)\/?$/, getMetadataForSpaceSection],
  [/^\/spaces\/([^/]+)\/(calendar|threads|polls|goals|classifieds)\/([^/]+)\/?$/, getMetadataForSpaceItem],
  [/^\/spaces\/([^/]+)\/([^/]+)\/?$/, getMetadataForRoom],
  [/^\/spaces\/([^/]+)\/?$/, getMetadataForSpace],
]

const getMetadataForRoute = async url => {
  for (const [regex, getMetadata] of routes) {
    const match = url.pathname.match(regex)
    if (match) {
      try {
        return await getMetadata(url, match)
      } catch (err) {
        console.error(`Error generating metadata for route ${url.pathname}:`, err)
        return undefined
      }
    }
  }
  return undefined
}

const injectMeta = metadata => {
  const $ = load(TEMPLATE_HTML)

  if (metadata.title) {
    $("title").text(metadata.title)
    $('meta[property="og:title"]').attr("content", metadata.title)
    $('meta[name="twitter:title"]').attr("content", metadata.title)
  }

  if (metadata.description) {
    $('meta[name="description"]').attr("content", metadata.description)
    $('meta[property="og:description"]').attr("content", metadata.description)
    $('meta[name="twitter:description"]').attr("content", metadata.description)
  }

  if (metadata.image) {
    $('meta[property="og:image"]').attr("content", metadata.image)
    $('meta[name="twitter:image"]').attr("content", metadata.image)
  }

  if (metadata.url) {
    $('meta[property="og:url"]').attr("content", metadata.url)
    $('meta[name="twitter:site"]').attr("content", metadata.site)
    $('meta[name="twitter:url"]').attr("content", metadata.url)
    $('link[rel="canonical"]').attr("href", metadata.url)
  }

  return $.html()
}

const app = new Hono()

// Only allow GET and HEAD requests
app.use("*", async (context, next) => {
  const method = context.req.method
  if (method !== "GET" && method !== "HEAD") {
    return context.text("Method Not Allowed", 405, {Allow: "GET, HEAD"})
  }
  await next()
})

// Serve static assets with appropriate caching
app.use(
  "*",
  serveStatic({
    root: BUILD_DIR,
    onFound: (filePath, context) => {
      const isImmutable = filePath.split(path.sep).join("/").includes("/_app/immutable/")
      const cacheControl =
        path.basename(filePath) === "index.html"
          ? "no-cache"
          : isImmutable
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600"

      context.header("Cache-Control", cacheControl)

      // Immutable assets are content-hashed by Vite, so the filename is itself a
      // stable content identifier. Exposing it as an ETag lets clients that
      // revalidate explicitly (e.g. emoji-picker-element checks its data source
      // on every load) skip re-downloading large files when nothing changed.
      if (isImmutable) {
        context.header("ETag", `"${path.basename(filePath)}"`)
      }
    },
  }),
)

// SPA fallback for routes that don't match static files
app.get("*", async context => {
  const requestUrl = requestUrlFromContext(context)
  const metadata = await getMetadataForRoute(requestUrl)
  const html = metadata ? injectMeta(metadata) : TEMPLATE_HTML

  return context.html(html, 200, {
    "Cache-Control": metadata ? "no-store" : "no-cache",
  })
})

serve(
  {
    fetch: app.fetch,
    hostname: HOST,
    port: PORT,
  },
  () => {
    console.log(`Flotilla server running on http://${HOST}:${PORT}`)
  },
)
