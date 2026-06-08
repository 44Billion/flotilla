import {db, kv, ss} from "@app/core/storage"
import {deactivateCurrentPomadeSession} from "@app/pomade"
import {Push} from "@app/push"

export const logout = async () => {
  await deactivateCurrentPomadeSession()
  await Push.disable()
  await kv.clear()
  await ss.clear()
  await db.clear()

  localStorage.clear()

  window.location.href = "/"
}
