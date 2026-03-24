import {db, kv, ss} from "@app/core/storage"
import {Push} from "@app/util/notifications"
import {deactivateCurrentPomadeSession} from "@app/util/pomade"

export const logout = async () => {
  await deactivateCurrentPomadeSession()
  await Push.disable()
  await kv.clear()
  await ss.clear()
  await db.clear()

  localStorage.clear()

  window.location.href = "/"
}
