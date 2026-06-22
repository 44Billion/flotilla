<script lang="ts">
  import {removeUndefined} from "@welshman/lib"
  import {deriveProfile} from "@welshman/app"
  import ContentMinimal from "@app/components/ContentMinimal.svelte"

  export type Props = {
    pubkey: string
    singleLine?: boolean
    url?: string
  }

  const {pubkey, url, singleLine}: Props = $props()

  const profile = deriveProfile(pubkey, removeUndefined([url]))
</script>

{#if $profile}
  <ContentMinimal event={{content: $profile.about || "", tags: []}} {singleLine} />
{/if}
