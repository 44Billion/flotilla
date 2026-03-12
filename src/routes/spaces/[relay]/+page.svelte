<script lang="ts">
  import {page} from "$app/stores"
  import {decodeRelay} from "@app/core/state"
  import {goToSpace} from "@app/util/routes"

  goToSpace(decodeRelay($page.params.relay!))
</script>
