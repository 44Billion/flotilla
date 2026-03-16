const toHttpUrl = (url: string) =>
  url
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://")
    .replace(/\/$/, "")

const livekitEndpoint = (url: string, groupId?: string) => {
  const base = `${toHttpUrl(url)}/.well-known/nip29/livekit`
  return groupId ? `${base}/${groupId}` : base
}

export const checkRelayHasLivekit = async (url: string): Promise<boolean> => {
  const endpoint = livekitEndpoint(url)

  try {
    const response = await fetch(endpoint)
    return response.status === 204
  } catch {
    return false
  }
}

export const getLivekitEndpoint = (url: string, groupId: string) => livekitEndpoint(url, groupId)
