<script lang="ts">
  import { dockNavigation } from '../../lib/dockNavigation';
  import { onMount } from 'svelte';
  import WeeklyPlanner from './WeeklyPlanner.svelte';
  import DailyPage from './DailyPage.svelte';
  import TodayButton from '../../lib/components/TodayButton.svelte';
  import { START, END, localKey, validDate } from '../calendar/model';
  import { addDays } from '../calendar/weekly-model';
  import '../calendar/calendar.css';
  import './planner.css';
  let { initialDay, initialWeek, onweek }: { initialDay?: string; initialWeek?: string; onweek: (date: string) => void } = $props();
  const today = localKey(new Date());
  let date = $state(today < START ? START : today > END ? END : today);
  let week = $state<string | undefined>(undefined);
  let initialized = $state(false);
  let mode = $state<'week' | 'day'>('week');
  onMount(() => {
    week = initialWeek;
    if (initialDay && validDate(initialDay)) { date = initialDay; week = initialDay; mode = 'day'; }
    initialized = true;
  });
  function openDay(day: string) { date = day; mode = 'day'; }
  function rememberWeek(day: string) { week = day; date = day; onweek(day); }
  function move(direction: number) { const next = addDays(date,direction); if (validDate(next)) { date = next; week = next; } }
  function returnToToday() {
    const now = localKey(new Date());
    date = now < START ? START : now > END ? END : now;
    week = date;
    onweek(date);
  }
</script>
<div class="planner-mode-switch calendar-tabs" aria-label="Planner view">
  <button class:chosen={mode === 'week'} aria-pressed={mode === 'week'} onclick={() => mode = 'week'}>Weekly planner</button>
  <button class:chosen={mode === 'day'} aria-pressed={mode === 'day'} onclick={() => mode = 'day'}>Daily planner</button>
</div>
{#if !initialized}
  <p class="calendar-notice" role="status">Opening planner…</p>
{:else if mode === 'week'}
  <WeeklyPlanner onopen={openDay} initialWeek={week} onweek={rememberWeek}/>
{:else}
  <section class="calendar-shell daily-planner-shell">
    <header class="calendar-toolbar"><h1>Daily planner</h1><label class="planner-date-picker">Date <input type="date" min={START} max={END} value={date} onchange={(e) => { if (validDate(e.currentTarget.value)) { date = e.currentTarget.value; week = date; } }}/></label></header>
    {#key date}<DailyPage {date}/>{/key}
    <div class="navigation-source"><footer use:dockNavigation class="calendar-bottom"><div class="calendar-navigation">
      <button class="triangle-button" aria-label="Previous day" disabled={date === START} onclick={() => move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M19 2v20L3 12z"/><path fill="white" d="M17 0v20L1 10z"/></svg></button>
      <h2>{new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</h2>
      <button class="triangle-button" aria-label="Next day" disabled={date === END} onclick={() => move(1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M3 2v20l16-10z"/><path fill="white" d="M1 0v20l16-10z"/></svg></button>
      <TodayButton label="Return to today" onclick={returnToToday}/>
    </div></footer></div>
  </section>
{/if}
