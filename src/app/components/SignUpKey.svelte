<script lang="ts">
  import {getKey} from "@lib/implicit"
  import KeyDownload from "@app/components/KeyDownload.svelte"

  type Props = {
    next: () => void
    step?: number
    totalSteps?: number
  }

  const {next, step, totalSteps}: Props = $props()

  const secret = getKey<string>("signup.secret")!
</script>

<KeyDownload {secret} {next} {step} {totalSteps} />
