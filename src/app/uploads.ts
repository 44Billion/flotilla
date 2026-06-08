import {Nip01Signer} from "@welshman/signer"
import type {UploadTask} from "@welshman/editor"
import {
  canUploadBlob,
  encryptFile,
  getListTags,
  getTagValues,
  makeBlossomAuthEvent,
  uploadBlob,
} from "@welshman/util"
import {getRelay, signer, userBlossomServerList} from "@welshman/app"
import {first, normalizeUrl, parseJson, sha256, simpleCache} from "@welshman/lib"
import {get} from "svelte/store"
import {compressFile} from "@lib/html"
import {DEFAULT_BLOSSOM_SERVERS} from "@app/env"

export const normalizeBlossomUrl = (url: string) => normalizeUrl(url.replace(/^ws/, "http"))

export const fetchHasBlossomSupport = async (url: string) => {
  const relay = getRelay(url)

  if (relay?.supported_nips?.map(String).includes("BUD-02")) {
    return true
  }

  const server = normalizeBlossomUrl(url)
  const $signer = signer.get() || Nip01Signer.ephemeral()
  const headers: Record<string, string> = {
    "X-Content-Type": "text/plain",
    "X-Content-Length": "1",
    "X-SHA-256": "73cb3858a687a8494ca3323053016282f3dad39d42cf62ca4e79dda2aac7d9ac",
  }

  try {
    const authEvent = await $signer.sign(makeBlossomAuthEvent({action: "upload", server}))
    const res = await canUploadBlob(server, {authEvent, headers})

    return res.status === 200
  } catch (e) {
    if (!String(e).match(/Failed to fetch|NetworkError/)) {
      console.error(e)
    }
  }

  return false
}

export const hasBlossomSupport = simpleCache(([url]: [string]) => fetchHasBlossomSupport(url))

export type GetBlossomServerOptions = {
  url?: string
}

export const getBlossomServer = async (options: GetBlossomServerOptions = {}) => {
  if (options.url) {
    if (await hasBlossomSupport(options.url)) {
      return normalizeBlossomUrl(options.url)
    }
  }

  const userUrls = getTagValues("server", getListTags(get(userBlossomServerList)))

  for (const url of userUrls) {
    return normalizeBlossomUrl(url)
  }

  return first(DEFAULT_BLOSSOM_SERVERS)!
}

export type UploadFileOptions = {
  url?: string
  encrypt?: boolean
  maxWidth?: number
  maxHeight?: number
}

export type UploadFileResult = {
  error?: string
  result?: UploadTask
}

export const uploadFile = async (file: File, options: UploadFileOptions = {}) => {
  try {
    const {name, type} = file

    if (!type.match("image/(webp|gif|svg)")) {
      file = await compressFile(file, options)
    }

    const tags: string[][] = []

    if (options.encrypt) {
      const {ciphertext, key, nonce, algorithm} = await encryptFile(file)

      tags.push(
        ["decryption-key", key],
        ["decryption-nonce", nonce],
        ["encryption-algorithm", algorithm],
      )

      file = new File([new Uint8Array(ciphertext)], name, {
        type: "application/octet-stream",
      })
    }

    const ext = "." + type.split("/")[1]
    const server = await getBlossomServer(options)
    const hashes = [await sha256(await file.arrayBuffer())]
    const $signer = signer.get() || Nip01Signer.ephemeral()
    const authTemplate = makeBlossomAuthEvent({action: "upload", server, hashes})
    const authEvent = await $signer.sign(authTemplate)
    const res = await uploadBlob(server, file, {authEvent})
    const text = await res.text()

    let task
    try {
      task = parseJson(text)
    } catch (e) {
      return {error: text}
    }

    if (!task?.uploaded) {
      return {error: text || `Failed to upload file (HTTP ${res.status})`}
    }

    // Always append correct file extension if we encrypted the file, or if it's missing
    let url = task.url
    if (options.encrypt) {
      url = url.replace(/\.\w+$/, "") + ext
    } else if (new URL(url).pathname.split(".").length === 1) {
      url += ext
    }

    const result = {...task, tags, url}

    return {result}
  } catch (e: any) {
    console.error("Error caught when uploading file:", e)

    return {error: e.toString()}
  }
}
