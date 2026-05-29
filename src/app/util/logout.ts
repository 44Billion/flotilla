import {db, kv, ss} from "@app/core/storage"
import {deactivateCurrentPomadeSession} from "@app/util/pomade"
import {Push} from "@app/util/push"

export const logout = async () => {
  await deactivateCurrentPomadeSession()
  await Push.disable()
  await kv.clear()
  await ss.clear()
  await db.clear()

  localStorage.clear()

  window.location.href = "/"
}
