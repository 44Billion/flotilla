<script context="module" lang="ts">
  import {synced} from "@welshman/store"
  import {kv} from "@app/core/storage"

  const dmNotificationsPrompted = synced({
    key: "dmNotificationsPrompted",
    defaultValue: false,
    storage: kv,
  })
</script>

<script lang="ts">
  import {onMount} from "svelte"
  import {page} from "$app/stores"
  import type {MakeNonOptional} from "@welshman/lib"
  import {append, uniq} from "@welshman/lib"
  import {pubkey} from "@welshman/app"
  import Chat from "@app/components/Chat.svelte"
  import {splitChatId} from "@app/core/state"
  import {notificationSettings} from "@app/core/state"
  import {pushToast} from "@app/util/toast"
  import {Push} from "@app/util/push"

  const {chat} = $page.params as MakeNonOptional<typeof $page.params>
  const pubkeys = uniq(append($pubkey!, splitChatId(chat)))

  onMount(async () => {
    if (!$dmNotificationsPrompted) {
      dmNotificationsPrompted.set(true)

      const permission = await Push.request()

      if (!permission.startsWith("granted")) {
        return pushToast({
          theme: "error",
          message: `Failed to request notification permissions (${permission}).`,
        })
      }

      notificationSettings.update(current => ({
        ...current,
        push: true,
        messages: true,
      }))

      pushToast({message: "Notifications enabled!"})
    }
  })
</script>

<Chat {pubkeys} />
