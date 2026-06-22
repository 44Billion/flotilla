<script lang="ts">
  import {roleColor, roleColorSoft, type SpaceRole} from "@app/members"

  interface Props {
    role: SpaceRole
  }

  const {role}: Props = $props()
</script>

<div
  class="badge min-w-0"
  style="background-color: {roleColorSoft(role.color)}; border-color: {roleColor(
    role.color,
  )}; color: {roleColor(role.color)};">
  <strong>{role.label || "Untitled Role"}</strong>
</div>
