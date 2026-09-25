<script lang="ts">
  import { dockNavigation } from '../../lib/dockNavigation';
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { getDatabase } from '../../lib/database';
  import { START, END, WEEKDAYS, MONTHS, COLORS, dateKey, localKey, validDate, monthCells, fullDate, eventsOnDay, ringStyle } from './model';
  import type { ImportantEvent, CalendarEvent, EventColor, CalendarLocation } from './model';
  import './calendar.css';
  import TodayButton from '../../lib/components/TodayButton.svelte';
  import WeeklyView from './WeeklyView.svelte';
  import { expandSeries, weekStart, weekDates, addDays } from './weekly-model';
  import type { TimedSeries } from './weekly-model';
  import type { PlannerLine } from './day-planner';

  let { onday, initialLocation }: { onday: (date: string, location: CalendarLocation) => void; initialLocation?: CalendarLocation } = $props();
  const now = localKey(new Date());
  const initial = now < START ? START : now > END ? END : now;
  let view = $state<'month' | 'year' | 'week'>('month');
  let month = $state(Number(initial.slice(5, 7)) - 1);
  let year = $state(Number(initial.slice(0, 4)));
  let hovered = $state<string | null>(null);
  let important = $state<ImportantEvent[]>([]);
  let storedEvents = $state<CalendarEvent[]>([]);
  let series = $state<TimedSeries[]>([]);
  const events = $derived([...storedEvents, ...expandSeries(series)]);
  let weekAnchor = $state(initial);
  const shownWeek = $derived(weekDates(weekAnchor));
  const weekLabel = $derived(`${new Date(shownWeek[0]+'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(shownWeek[6]+'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  function seriesSaved(item: TimedSeries) { series = [...series.filter(s => s.id !== item.id), item]; weekAnchor = item.first_date; }
  let schedule = $state<PlannerLine[]>([]);
  let ready = $state(false);
  let loading = $state(true);
  let error = $state('');
  let busy = $state(false);
  let formError = $state('');
  let eventDate = $state(initial);
  let title = $state('');
  let color = $state<EventColor>('red');
  let eventDialog: HTMLDialogElement;
  let dayMenu: HTMLDialogElement;
  let menuDate = $state('');
  let deleteError = $state('');
  function openDayMenu(event: MouseEvent, key: string) {
    event.preventDefault(); event.stopPropagation();
    if (!ready || busy) return;
    menuDate = key; deleteError = ''; dayMenu.showModal();
  }
  async function deleteImportant(id: string) {
    if (busy) return;
    busy = true; deleteError = '';
    try {
      const db = await getDatabase();
      await db.execute('DELETE FROM important_events WHERE id=$1',[id]);
      important = important.filter(item => item.id !== id);
      if (!onDate(menuDate).length) dayMenu.close();
    } catch { deleteError = 'Could not delete this event. Please try again.'; }
    finally { busy = false; }
  }
  const cells = $derived(monthCells(year, month));
  const yearMonths = $derived(year === 2026 ? [8, 9, 10, 11] : Array.from({ length: 12 }, (_, i) => i));
  const onDate = (key: string) => important.filter(e => e.event_date === key);
  const firstMonth = $derived(year === 2026 && month === 8);
  const lastMonth = $derived(year === 2027 && month === 11);

  async function load() {
    loading = true; error = '';
    try {
      const db = await getDatabase();
      const [savedImportant, savedEvents, savedSchedule, savedSeries] = await Promise.all([
        db.select<ImportantEvent[]>('SELECT id, event_date, title, color FROM important_events ORDER BY event_date, created_at, id'),
        db.select<CalendarEvent[]>('SELECT id, title, starts_at, ends_at, all_day, timezone FROM calendar_events ORDER BY starts_at, id'),
        db.select<PlannerLine[]>("SELECT * FROM day_planner_lines WHERE section = 'slot' AND text != '' ORDER BY position"),
        db.select<TimedSeries[]>('SELECT * FROM timed_event_series ORDER BY first_date, start_minute'),
      ]);
      important = savedImportant; storedEvents = savedEvents; schedule = savedSchedule; series = savedSeries; ready = true;
    } catch (e) { error = `Could not open your calendar: ${String(e)}`; }
    finally { loading = false; }
  }
  onMount(() => {
    if (initialLocation) { view = initialLocation.view; month = initialLocation.month; year = initialLocation.year; weekAnchor = initialLocation.weekAnchor; }
    if (!isTauri()) { loading = false; error = 'Browser preview. Open the desktop app to load and save your events.'; return; }
    void load();
  });
  function switchView(next: 'month' | 'year' | 'week') {
    if (next === view) return;
    if (next === 'week') weekAnchor = (weekAnchor.slice(0,7) === dateKey(year,month,1).slice(0,7) ? weekAnchor : dateKey(year,month,1));
    if (view === 'week' && next !== 'week') { const key = shownWeek.find(d => d >= START && d <= END)!; year = Number(key.slice(0,4)); month = Number(key.slice(5,7))-1; }
    view = next; hovered = null;
  }
  function move(direction: number) {
    if (view === 'week') {
      const next = addDays(weekStart(weekAnchor), direction * 7);
      if (addDays(next,6) < START || next > END) return;
      weekAnchor = next < START ? START : next; return;
    }
    if (view === 'year') {
      const next = year + direction;
      if (next < 2026 || next > 2027) return;
      year = next; if (year === 2026 && month < 8) month = 8;
    } else {
      const next = new Date(year, month + direction, 1, 12);
      if (dateKey(next.getFullYear(), next.getMonth(), 1) < START || dateKey(next.getFullYear(), next.getMonth(), 1) > END) return;
      year = next.getFullYear(); month = next.getMonth();
    }
    hovered = null;
  }
  function openDay(key: string) { onday(key, { view, month, year, weekAnchor }); }
  function returnToToday() {
    const today = localKey(new Date());
    const key = today < START ? START : today > END ? END : today;
    year = Number(key.slice(0,4)); month = Number(key.slice(5,7))-1;
    weekAnchor = key; hovered = null;
  }
  function openForm(selectedDate?: string) {
    if (!ready) return;
    eventDate = selectedDate ?? (view === 'week' ? (weekAnchor < START ? START : weekAnchor) : hovered ?? dateKey(year, month, 1));
    title = ''; color = 'red'; formError = '';
    eventDialog.showModal();
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    if (!validDate(eventDate) || !title.trim() || title.trim().length > 120 || !(color in COLORS)) { formError = 'Choose a valid date, a name, and a color.'; return; }
    busy = true; formError = '';
    try {
      const item: ImportantEvent = { id: crypto.randomUUID(), event_date: eventDate, title: title.trim(), color };
      const db = await getDatabase();
      await db.execute('INSERT INTO important_events (id, event_date, title, color) VALUES ($1, $2, $3, $4)', [item.id, item.event_date, item.title, item.color]);
      important = [...important, item].sort((a,b) => a.event_date.localeCompare(b.event_date));
      year = Number(eventDate.slice(0,4)); month = Number(eventDate.slice(5,7)) - 1;
      hovered = eventDate; weekAnchor = eventDate;
      eventDialog.close();
    } catch (e) { formError = `Could not save the event. Please try again. ${String(e)}`; }
    finally { busy = false; }
  }
</script>

<section class="calendar-shell" aria-label="Calendar">
  <header class="calendar-toolbar">
    <h1>Calendar</h1>
    <div class="calendar-tabs" aria-label="Calendar view">
      <button class:chosen={view === 'month'} aria-pressed={view === 'month'} onclick={() => switchView('month')}>Monthly</button>
      <button class:chosen={view === 'week'} aria-pressed={view === 'week'} onclick={() => switchView('week')}>Weekly</button>
      <button class:chosen={view === 'year'} aria-pressed={view === 'year'} onclick={() => switchView('year')}>Yearly</button>
    </div>
    <span class="calendar-range">SEP 2026 — DEC 2027</span>
  </header>
  {#if loading}<p class="calendar-notice" role="status">Opening your calendar…</p>{/if}
  {#if error}<div class="calendar-notice" role="alert">{error}{#if isTauri()} <button onclick={load}>Retry</button>{/if}</div>{/if}

  {#if view === 'month'}
    <div class="month-grid" role="table" aria-label={`${MONTHS[month]} ${year}`}>
      <div class="month-weekdays" role="row">{#each WEEKDAYS as day}<div role="columnheader">{day}</div>{/each}</div>
      {#each Array(6) as _, week}
        <div class="month-week" role="row">
          {#each cells.slice(week * 7, week * 7 + 7) as key}
            <div class="month-cell" role="cell">
              {#if key}<button class="month-day" class:today={key === now} aria-label={`${fullDate(key)}, ${onDate(key).length + eventsOnDay(events, key).filter(e => e.all_day).length} events`} oncontextmenu={(event) => openDayMenu(event,key)} onclick={() => openDay(key)}>
                <span class="day-number">{Number(key.slice(8))}</span>
                <span class="day-events">
                  {#each onDate(key) as item}<span class="month-event" style:--event-color={COLORS[item.color]}><i></i>{item.title}</span>{/each}
                  {#each eventsOnDay(events, key).filter(e => e.all_day) as item}<span class="month-event regular"><i></i>{item.title}</span>{/each}
                </span>
              </button>{/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {:else if view === 'week'}
    <WeeklyView date={weekAnchor} {events} {schedule} {important} {ready} onopen={openDay} onsaved={seriesSaved} {series} onrefresh={load}/>
  {:else if view === 'year'}
    <div class="year-layout">
      <div class="year-months">
        {#each yearMonths as m}
          <section class="mini-month" aria-label={`${MONTHS[m]} ${year}`}>
            <h2>{MONTHS[m]}</h2>
            <div class="mini-grid">
              {#each WEEKDAYS as day}<span class="mini-weekday" aria-hidden="true">{day.slice(0,2)}</span>{/each}
              {#each monthCells(year, m) as key}
                {#if key}<button class="mini-day" class:today={key === now} class:selected={key === hovered} style:--day-ring={ringStyle(onDate(key))} aria-label={`${fullDate(key)}${onDate(key).length ? `, ${onDate(key).length} important events` : ''}`} onmouseenter={() => hovered = key} onfocus={() => hovered = key} oncontextmenu={(event) => openDayMenu(event,key)} onclick={() => openDay(key)}><span>{Number(key.slice(8))}</span></button>
                {:else}<span></span>{/if}
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <aside class="important-panel" aria-label="Important events" aria-live="polite">
        <h2>Important events</h2>
        {#if hovered}<h3>{fullDate(hovered)}</h3>
          {#if onDate(hovered).length}<ul>{#each onDate(hovered) as item}<li style:--event-color={COLORS[item.color]}><i></i><span>{item.title}</span><button class="delete-important-button" aria-label={`Delete ${item.title}`} disabled={busy} onclick={() => deleteImportant(item.id)}>×</button></li>{/each}</ul>
          {:else}<p>No important events for this day.</p>{/if}
        {:else}<p>Hover over a day to see what matters.</p>{/if}
      </aside>
    </div>
  {/if}

  <div class="navigation-source"><footer use:dockNavigation class="calendar-bottom">
    <button class="add-important" aria-label="Add important event" title="Add important event" disabled={!ready || busy} onclick={() => openForm()}>
      <svg viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges"><path class="plus-backplate" fill="#050505" d="M10 1h12v2h5v4h3v4h2v10h-2v5h-4v4h-5v2H11v-2H6v-4H2v-5H0V11h2V6h4V3h4z"/><path fill="#494949" d="M13 7h7v7h7v7h-7v7h-7v-7H6v-7h7z"/><path fill="#ffffff" d="M12 6h6v7h7v6h-7v7h-6v-7H5v-6h7z"/></svg>
    </button>
      <div class="calendar-navigation">
        <button class="triangle-button" aria-label={view === 'year' ? 'Previous year' : view === 'week' ? 'Previous week' : 'Previous month'} disabled={view === 'year' ? year === 2026 : view === 'week' ? shownWeek[0] <= START : firstMonth} onclick={() => move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M19 2v20L3 12z"/><path fill="white" d="M17 0v20L1 10z"/></svg></button>
        <h2 aria-live="polite">{view === 'year' ? year : view === 'week' ? weekLabel : `${MONTHS[month]} ${year}`}</h2>
        <button class="triangle-button right" aria-label={view === 'year' ? 'Next year' : view === 'week' ? 'Next week' : 'Next month'} disabled={view === 'year' ? year === 2027 : view === 'week' ? shownWeek[6] >= END : lastMonth} onclick={() => move(1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M3 2v20l16-10z"/><path fill="white" d="M1 0v20l16-10z"/></svg></button>
        {#if view !== 'year'}<TodayButton label={view === 'week' ? 'Return to this week' : 'Return to this month'} onclick={returnToToday}/>{/if}
      </div>
  </footer></div>
</section>

<dialog class="calendar-dialog" bind:this={eventDialog} oncancel={(event) => { if (busy) event.preventDefault(); }}>
  <form onsubmit={save}>
    <h2>Something important</h2>
    <label for="important-date">Choose a day</label>
    <input id="important-date" type="date" min={START} max={END} required bind:value={eventDate} disabled={busy}/>
    <label for="important-title">Event name</label>
    <input id="important-title" type="text" maxlength="120" required bind:value={title} placeholder="What’s happening?" disabled={busy}/>
    <fieldset disabled={busy}><legend>Circle color</legend><div class="event-colors">{#each Object.entries(COLORS) as [name, hex]}<label class="color-option" style:--swatch={hex}><input type="radio" name="event-color" value={name} bind:group={color}/><span class="swatch"></span><span>{name}</span></label>{/each}</div></fieldset>
    {#if formError}<p class="calendar-form-error" role="alert">{formError}</p>{/if}
    <div class="dialog-actions"><button type="button" disabled={busy} onclick={() => eventDialog.close()}>Cancel</button><button type="submit" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save event'}</button></div>
  </form>
</dialog>

<dialog class="calendar-dialog" bind:this={dayMenu} oncancel={(e) => { if (busy) e.preventDefault(); }}>
  <h2>Day events</h2>
  <p>{menuDate ? fullDate(menuDate) : ''}</p>
  <div class="dialog-actions"><button disabled={busy} onclick={() => { dayMenu.close(); openForm(menuDate); }}>+ Add event</button></div>
  <div class="delete-event-list">{#each onDate(menuDate) as item}<div><span>{item.title}</span><button disabled={busy} onclick={() => deleteImportant(item.id)}>Delete event</button></div>{/each}</div>
  {#if deleteError}<p role="alert">{deleteError}</p>{/if}
  <div class="dialog-actions"><button disabled={busy} onclick={() => dayMenu.close()}>Close</button></div>
</dialog>
