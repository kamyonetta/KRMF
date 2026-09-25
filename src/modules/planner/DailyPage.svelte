<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { getDatabase } from '../../lib/database';
  import { COLORS, fullDate, eventsOnDay } from '../calendar/model';
  import type { CalendarEvent, ImportantEvent } from '../calendar/model';
  import { expandSeries } from '../calendar/weekly-model';
  import type { TimedSeries } from '../calendar/weekly-model';
  import DayPlanner from './DayPlanner.svelte';
  let { date }: { date: string } = $props();
  let events = $state<CalendarEvent[]>([]);
  let important = $state<ImportantEvent[]>([]);
  let error = $state('');
  let loading = $state(true);
  async function load() {
    loading = true; error = '';
    try {
      const db = await getDatabase();
      const [saved, series, marked] = await Promise.all([
        db.select<CalendarEvent[]>('SELECT * FROM calendar_events ORDER BY starts_at'),
        db.select<TimedSeries[]>('SELECT * FROM timed_event_series'),
        db.select<ImportantEvent[]>('SELECT * FROM important_events WHERE event_date=$1 ORDER BY created_at',[date]),
      ]);
      events = eventsOnDay([...saved,...expandSeries(series)],date); important = marked;
    } catch (e) { error = `Could not load events: ${String(e)}`; }
    finally { loading = false; }
  }
  onMount(() => { if (isTauri()) void load(); else loading = false; });
</script>
<div class="day-page">
  <h2>{fullDate(date)}</h2>
  {#if loading}<p role="status">Opening your day…</p>
  {:else if error}<p role="alert">{error} <button class="day-back" onclick={load}>Retry</button></p>
  {:else}
    {#if important.length || events.some(e=>e.all_day)}<ul class="day-event-list">
      {#each important as item}<li style:--event-color={COLORS[item.color]}><i></i><div><span class="event-type">IMPORTANT · ALL DAY</span><h3>{item.title}</h3></div></li>{/each}
      {#each events.filter(e=>e.all_day) as item}<li style:--event-color="white"><i></i><h3>{item.title}</h3></li>{/each}
    </ul>{/if}
    <DayPlanner {date} {events} onsaved={() => {}}/>
  {/if}
</div>
