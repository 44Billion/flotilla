<script lang="ts">
  import History from "@assets/icons/history.svg?dataurl"
  import AltArrowRight from "@assets/icons/alt-arrow-right.svg?dataurl"
  import Icon from "@lib/components/Icon.svelte"
  import Link from "@lib/components/Link.svelte"
  import RecentItem from "@app/components/RecentItem.svelte"
  import {deriveRecentActivity} from "@app/recent"
  import {makeSpacePath} from "@app/routes"

  type Props = {
    url: string
  }

  const {url}: Props = $props()

  const recentActivity = deriveRecentActivity(url)
  const recentPath = makeSpacePath(url, "recent")
</script>

<div class="card2 bg-alt flex flex-col gap-3">
  <h3 class="flex items-center gap-2 text-lg font-bold">
    <Icon icon={History} />
    Recent Activity
  </h3>
  {#if $recentActivity.length === 0}
    <p class="text-sm opacity-70">No recent activity yet.</p>
  {:else}
    <div class="flex flex-col gap-2">
      {#each $recentActivity.slice(0, 3) as item (item.event.id)}
        <RecentItem {url} {item} />
      {/each}
    </div>
  {/if}
  <Link href={recentPath} class="btn btn-neutral btn-sm">
    View all recent activity
    <Icon icon={AltArrowRight} size={4} />
  </Link>
</div>
