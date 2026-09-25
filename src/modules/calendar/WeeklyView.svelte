<script lang="ts">
  import { getDatabase } from '../../lib/database';
  import { START, END, COLORS, WEEKDAYS, fullDate, eventsOnDay } from './model';
  import type { ImportantEvent, EventColor } from './model';
  import type { PlannerLine } from './day-planner';
  import { weekDates, timeText, parseTime, validateSeries, layoutDay, supported, plannerBlocks, dayWindow } from './weekly-model';
  import type { TimedSeries, TimedOccurrence } from './weekly-model';
  let { date, events, schedule, important, ready, onopen, onsaved, series, onrefresh }: {
    series: TimedSeries[]; onrefresh: () => Promise<void>; date: string; events: TimedOccurrence[]; schedule: PlannerLine[]; important: ImportantEvent[]; ready: boolean;
    onopen: (date: string) => void; onsaved: (series: TimedSeries) => void;
  } = $props();
  const days = $derived(weekDates(date));
  let dialog: HTMLDialogElement;
  let deleteDialog: HTMLDialogElement;
  let removing = $state<{event: TimedOccurrence | ImportantEvent; day: string; important: boolean} | null>(null);
  let deleteError = $state('');
  const deletingSeries = $derived.by(() => { const event = removing?.event; const id = event && 'series_id' in event ? event.series_id : undefined; return series.find(s => s.id === id); });
  function requestDelete(e: MouseEvent, event: TimedOccurrence | ImportantEvent, day: string, important = false) {
    e.preventDefault(); e.stopPropagation();
    if (!ready || busy) return;
    removing = {event, day, important}; deleteError = ''; deleteDialog.showModal();
  }
  async function removeEvent(wholeSeries = false) {
    if (!removing || busy) return;
    busy = true; deleteError = '';
    try {
      const db = await getDatabase();
      const {event, day, important} = removing;
      if (important) await db.execute('DELETE FROM important_events WHERE id=$1',[event.id]);
      else if (deletingSeries) {
        if (deletingSeries.repeat_until && !wholeSeries) {
          await db.execute("UPDATE timed_event_series SET excluded_dates=json_insert(excluded_dates,'$[#]',$2) WHERE id=$1",[deletingSeries.id,day]);
        } else await db.execute('DELETE FROM timed_event_series WHERE id=$1',[deletingSeries.id]);
      } else if (event.id.startsWith('slot:')) {
        const range = dayWindow(event as TimedOccurrence,day);
        await db.execute("DELETE FROM day_planner_lines WHERE plan_date=$1 AND section='slot' AND position BETWEEN $2 AND $3 AND trim(text)=$4",[day,range.start/30-16,range.end/30-17,event.title]);
      } else await db.execute('DELETE FROM calendar_events WHERE id=$1',[event.id]);
      await onrefresh(); deleteDialog.close(); removing = null;
    } catch { deleteError = 'Could not delete this activity. Please try again.'; }
    finally { busy = false; }
  }
  let eventDate = $state(''); let title = $state(''); let start = $state('09:00'); let end = $state('10:00');
  let repeats = $state(false); let until = $state(END); let color = $state<EventColor>('blue');
  let midnight = $state(false);
  let editing = $state<TimedOccurrence | null>(null);
  let sourceDay = $state('');
  const timeValue = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`;
  function editEvent(event: TimedOccurrence, key: string) {
    if (!ready) return;
    editing = event; sourceDay = key; error = '';
    const original = series.find(s => s.id === event.series_id);
    const window = dayWindow(event,key);
    title = original?.title ?? event.title; eventDate = original?.first_date ?? key;
    start = timeValue(original?.start_minute ?? window.start); midnight = (original?.end_minute ?? window.end) === 1440; end = midnight ? '00:00' : timeValue(original?.end_minute ?? window.end);
    repeats = !!original?.repeat_until; until = original?.repeat_until ?? END; color = original?.color ?? event.color ?? 'blue';
    dialog.showModal();
  }
  let busy = $state(false); let error = $state('');
  function openForm(key: string, minute = 9 * 60) {
    if (!ready || !supported(key)) return;
    editing = null; sourceDay = ''; midnight = false;
    eventDate = key; title = ''; repeats = false; until = END; color = 'blue'; error = '';
    start = `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`;
    const last = Math.min(minute + 60, 1439); end = `${String(Math.floor(last / 60)).padStart(2,'0')}:${String(last % 60).padStart(2,'0')}`;
    dialog.showModal();
  }
  async function save(e: SubmitEvent) {
    e.preventDefault(); if (busy) return;
    const item: TimedSeries = { id: editing?.series_id ?? crypto.randomUUID(), title: title.trim(), first_date: eventDate, start_minute: parseTime(start), end_minute: midnight ? 1440 : parseTime(end), repeat_until: repeats ? until : null, color, excluded_dates: series.find(s => s.id === editing?.series_id)?.excluded_dates ?? '[]' };
    if (!validateSeries(item)) { error = 'Enter a name, an end time after the start, and a repeat end date on or after the event date.'; return; }
    busy = true; error = '';
    try {
      const db = await getDatabase();
      const values = [item.id,item.title,item.first_date,item.start_minute,item.end_minute,item.repeat_until,item.color];
      if (editing?.series_id) {
        await db.execute('UPDATE timed_event_series SET title=$2,first_date=$3,start_minute=$4,end_minute=$5,repeat_until=$6,color=$7 WHERE id=$1', values);
      } else {
        const manual = editing?.id.startsWith('slot:');
        const source = editing ? dayWindow(editing,sourceDay) : null;
        await db.execute('INSERT INTO timed_event_series (id,title,first_date,start_minute,end_minute,repeat_until,color,source_date,source_first,source_last,source_text,source_event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [...values, manual ? sourceDay : null, manual && source ? source.start / 30 - 16 : null, manual && source ? source.end / 30 - 17 : null, manual ? editing!.title : null, editing && !manual ? editing.id : null]);
      }
      if (editing && !editing.series_id) await onrefresh();
      onsaved(item); dialog.close();
    } catch (e) { error = `Could not save this event: ${String(e)}`; }
    finally { busy = false; }
  }
  function dayItems(key: string): TimedOccurrence[] {
    return [
      ...eventsOnDay(events, key).filter(e => !e.all_day),
      ...plannerBlocks(schedule, key),
    ];
  }
</script>
<div class="weekly-actions"><span>Click a day header to open its planner. Click an activity to edit. Right-click to delete.</span><button disabled={!ready} onclick={() => openForm(supported(date) ? date : START)}>+ Add event</button></div>
<div class="weekly-scroll">
  <div class="weekly-board">
    <div class="weekly-headers"><div></div>{#each days as key, i}<button disabled={!supported(key)} onclick={() => onopen(key)} aria-label={`Open ${fullDate(key)}`}><span>{WEEKDAYS[i]}</span><strong>{Number(key.slice(8))}</strong></button>{/each}</div>
    <div class="weekly-allday"><span>All day</span>{#each days as key}<div>{#each important.filter(e => e.event_date === key) as item}<button style:--block-color={COLORS[item.color]} oncontextmenu={(e) => requestDelete(e,item,key,true)} onclick={() => onopen(key)}>{item.title}</button>{/each}{#each eventsOnDay(events,key).filter(e => e.all_day) as item}<button oncontextmenu={(e) => requestDelete(e,item,key)} onclick={() => onopen(key)}>{item.title}</button>{/each}</div>{/each}</div>
    <div class="weekly-timeline"><div class="weekly-hours">{#each Array(15) as _, index}<span style:top={`${index / 15 * 100}%`}>{timeText((index + 8) * 60)}</span>{/each}</div>
      {#each days as key}<div class="weekly-day-column" class:outside={!supported(key)}>
        {#each Array(30) as _, half}<button class="weekly-empty-slot" disabled={!ready || !supported(key)} aria-label={`Add event ${fullDate(key)} at ${timeText(480 + half * 30)}`} onclick={() => openForm(key, 480 + half * 30)}></button>{/each}
        {#if supported(key)}{#each layoutDay(dayItems(key),key).filter(b => b.end > 480 && b.start < 1380) as block}<button class="weekly-event" class:short={Math.min(block.end,1380) - Math.max(block.start,480) <= 15} class:manual={block.event.id.startsWith('slot:')} style:--block-color={COLORS[block.event.color ?? 'blue']} style:top={`calc(${(Math.max(block.start,480) - 480) / 900 * 100}% + 2px)`} style:height={`max(1px, calc(${(Math.min(block.end,1380) - Math.max(block.start,480)) / 900 * 100}% - 4px))`} style:left={`calc(${block.lane * 100 / block.lanes}% + 2px)`} style:width={`calc(${100 / block.lanes}% - 4px)`} oncontextmenu={(e) => requestDelete(e,block.event,key)} onclick={() => editEvent(block.event,key)} title={`${block.event.title} · ${timeText(block.start)}–${timeText(block.end)}`}><strong>{block.event.title}</strong><span>{timeText(block.start)}–{timeText(block.end)}</span></button>{/each}{/if}
      </div>{/each}
    </div>
  </div>
</div>
<dialog class="calendar-dialog weekly-dialog" bind:this={dialog} oncancel={(e) => { if (busy) e.preventDefault(); }}>
  <form onsubmit={save}>
    <h2>{editing ? 'Edit activity' : 'Add timed event'}</h2>
    {#if editing?.series_id && series.find(s => s.id === editing?.series_id)?.repeat_until}<p>Changes apply to the whole weekly series.</p>{/if}
    <label for="weekly-title">Name</label><input id="weekly-title" maxlength="20" required bind:value={title} disabled={busy}/>
    <label for="weekly-date">First date</label><input id="weekly-date" type="date" min={START} max={END} required bind:value={eventDate} disabled={busy}/>
    <div class="weekly-time-inputs"><label>Start<input type="time" required bind:value={start} disabled={busy}/></label><label>End<input type="time" required bind:value={end} disabled={busy || midnight}/></label></div>
    <label class="weekly-repeat"><input type="checkbox" bind:checked={midnight} disabled={busy}/> Ends at midnight</label>
    <label class="weekly-repeat"><input type="checkbox" bind:checked={repeats} disabled={busy}/> Repeat every week</label>
    {#if repeats}<label for="repeat-until">Repeat through (inclusive)</label><input id="repeat-until" type="date" min={eventDate || START} max={END} required bind:value={until} disabled={busy}/>{/if}
    <fieldset disabled={busy}><legend>Color</legend><div class="event-colors">{#each Object.entries(COLORS) as [name,hex]}<label class="color-option" style:--swatch={hex}><input type="radio" name="weekly-color" value={name} bind:group={color}/><span class="swatch"></span><span>{name}</span></label>{/each}</div></fieldset>
    {#if error}<p role="alert" class="calendar-form-error">{error}</p>{/if}
    <div class="dialog-actions"><button type="button" disabled={busy} onclick={() => dialog.close()}>Cancel</button><button type="submit" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save event'}</button></div>
  </form>
</dialog>

<dialog class="calendar-dialog" bind:this={deleteDialog} oncancel={(e) => { if (busy) e.preventDefault(); }}>
  <h2>Delete activity</h2>
  <p>{removing?.event.title}</p>
  <p>{removing ? fullDate(removing.day) : ''}</p>
  {#if deleteError}<p role="alert" class="calendar-form-error">{deleteError}</p>{/if}
  <div class="dialog-actions">
    <button disabled={busy} onclick={() => deleteDialog.close()}>Cancel</button>
    <button disabled={busy} onclick={() => removeEvent()}>{deletingSeries?.repeat_until ? 'Delete this occurrence' : 'Delete event'}</button>
  </div>
  {#if deletingSeries?.repeat_until}<div class="dialog-actions"><button disabled={busy} onclick={() => removeEvent(true)}>Delete entire series</button></div>{/if}
</dialog>
