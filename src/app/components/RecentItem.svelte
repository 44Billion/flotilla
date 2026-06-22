<script lang="ts">
  import {THREAD, CLASSIFIED, ZAP_GOAL, EVENT_TIME, POLL} from "@welshman/util"
  import NoteItem from "@app/components/NoteItem.svelte"
  import ThreadItem from "@app/components/ThreadItem.svelte"
  import ClassifiedItem from "@app/components/ClassifiedItem.svelte"
  import GoalItem from "@app/components/GoalItem.svelte"
  import CalendarEventItem from "@app/components/CalendarEventItem.svelte"
  import PollItem from "@app/components/PollItem.svelte"
  import RecentConversation from "@app/components/RecentConversation.svelte"
  import type {RecentActivityItem} from "@app/recent"

  type Props = {
    url: string
    item: RecentActivityItem
  }

  const {url, item}: Props = $props()
</script>

{#if item.type === "message"}
  <RecentConversation {url} event={item.event} count={item.count} />
{:else if item.event.kind === THREAD}
  <ThreadItem {url} event={item.event} />
{:else if item.event.kind === CLASSIFIED}
  <ClassifiedItem {url} event={item.event} />
{:else if item.event.kind === ZAP_GOAL}
  <GoalItem {url} event={item.event} />
{:else if item.event.kind === EVENT_TIME}
  <CalendarEventItem {url} event={item.event} />
{:else if item.event.kind === POLL}
  <PollItem {url} event={item.event} />
{:else}
  <NoteItem {url} event={item.event} />
{/if}
