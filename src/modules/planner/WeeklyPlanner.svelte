<script lang="ts">
  import DeleteTodoButton from '../../lib/components/DeleteTodoButton.svelte';
  import { dockNavigation } from '../../lib/dockNavigation';
  import TodayButton from '../../lib/components/TodayButton.svelte';
  import { autosize } from '../../lib/autosize';
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { START, END, localKey, fullDate } from '../calendar/model';
  import { weekDates, weekStart, addDays, supported } from '../calendar/weekly-model';
  import { saveLine, deleteTodo } from '../calendar/day-planner';
  import type { CalendarTodo, WeeklyTask } from './model';
  import { writePlanner, plannerDatabase } from './storage';
  import '../calendar/calendar.css';
  import './planner.css';
  let { onopen, initialWeek, onweek }: { onopen: (date: string) => void; initialWeek?: string; onweek: (date: string) => void } = $props();
  const today = localKey(new Date());
  let anchor = $state(today < START ? START : today > END ? END : today);
  let days = $state<string[]>([]);
  let dayNotes = $state<{plan_date:string;body:string}[]>([]);
  let todos = $state<CalendarTodo[]>([]);
  let tasks = $state<WeeklyTask[]>([]);
  let notes = $state('');
  let ready = $state(false);
  let deleting = $state(false);
  let loading = $state(true);
  let pending = $state(0);
  let error = $state('');
  type Job = { run: () => Promise<void> };
  let failed = $state<Record<string, Job>>({});
  const week = $derived(weekStart(anchor));
  const range = $derived(days.length ? `${new Date(days[0]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(days[6]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}` : '');
  const locked = $derived(loading || pending > 0 || Object.keys(failed).length > 0);
  async function persist(key: string, run: () => Promise<void>) {
    const job = { run }; failed[key] = job; pending++;
    try { await run(); if (failed[key]?.run === run) delete failed[key]; if (!Object.keys(failed).length) error = ''; }
    catch { error = 'Some changes could not be saved. Retry before leaving this week.'; }
    finally { pending--; }
  }
  function saveDayNote(note: {plan_date:string;body:string}) {
    const values=[note.plan_date,note.body];
    void persist(`day-note:${note.plan_date}`,()=>writePlanner('INSERT INTO daily_notes(plan_date,body) VALUES($1,$2) ON CONFLICT(plan_date) DO UPDATE SET body=excluded.body',values));
  }
  async function loadWeek() {
    loading = true; ready = false; error = '';
    days = weekDates(anchor); onweek(anchor);
    if (!isTauri()) {
      dayNotes = days.filter(supported).map(plan_date => ({plan_date,body:''}));
      loading = false; error = 'Open the desktop app to edit and save your planner.'; return;
    }
    try {
      const db = await plannerDatabase();
      const [savedDayNotes, savedTodos, savedNotes, savedTasks, legacyDayBoxes, importantEvents] = await Promise.all([
        db.select<{plan_date:string;body:string}[]>('SELECT plan_date,body FROM daily_notes WHERE plan_date BETWEEN $1 AND $2',[days[0],days[6]]),
        db.select<CalendarTodo[]>("SELECT plan_date,position,text,checked FROM day_planner_lines WHERE section='todo' AND plan_date BETWEEN $1 AND $2 ORDER BY plan_date,position",[days[0],days[6]]),
        db.select<{body:string}[]>('SELECT body FROM weekly_planner_notes WHERE week_start=$1',[week]),
        db.select<WeeklyTask[]>('SELECT id,week_start,title,checked FROM weekly_planner_tasks WHERE week_start=$1 ORDER BY created_at,id',[week]),
        db.select<{plan_date:string;body:string;imported_positions:string}[]>('SELECT plan_date,body,imported_positions FROM weekly_planner_days WHERE plan_date BETWEEN $1 AND $2',[days[0],days[6]]),
        db.select<{id:string;event_date:string;title:string}[]>('SELECT id,event_date,title FROM important_events WHERE event_date BETWEEN $1 AND $2 ORDER BY event_date,created_at,id',[days[0],days[6]]),
      ]);
      todos = savedTodos; notes = savedNotes[0]?.body ?? ''; tasks = savedTasks;
      const trackingWrites:Promise<unknown>[]=[];
      dayNotes = days.filter(supported).map(plan_date=>{
        const current=savedDayNotes.find(n=>n.plan_date===plan_date)?.body ?? '';
        const tracker=legacyDayBoxes.find(n=>n.plan_date===plan_date);
        const legacy=tracker?.body ?? '';
        const imported=new Set<string>(JSON.parse(tracker?.imported_positions ?? '[]').map(String));
        let body=current;
        const legacyKey='legacy-note-migrated';
        if(!imported.has(legacyKey)){if(legacy.trim()&&!current.includes(legacy))body=current.trim()?`${current}\n\n${legacy}`:legacy;imported.add(legacyKey);}
        for(const event of importantEvents.filter(e=>e.event_date===plan_date)){const key=`important:${event.id}`;if(!imported.has(key)){body=body.trim()?`${body}\n${event.title}`:event.title;imported.add(key);}}
        const positions=JSON.stringify([...imported]);
        if(positions!==(tracker?.imported_positions ?? '[]')) trackingWrites.push(writePlanner('INSERT INTO weekly_planner_days(plan_date,body,imported_positions) VALUES($1,$2,$3) ON CONFLICT(plan_date) DO UPDATE SET imported_positions=excluded.imported_positions',[plan_date,legacy,positions]));
        return {plan_date,body};
      });
      for(const note of dayNotes) if(note.body!==(savedDayNotes.find(n=>n.plan_date===note.plan_date)?.body ?? '')) await writePlanner('INSERT INTO daily_notes(plan_date,body) VALUES($1,$2) ON CONFLICT(plan_date) DO UPDATE SET body=excluded.body',[note.plan_date,note.body]);
      await Promise.all(trackingWrites);
      ready = true;
    } catch (e) { error = `Could not open this week: ${String(e)}`; }
    finally { loading = false; }
  }
  onMount(() => { if (initialWeek) anchor = initialWeek; void loadWeek(); });
  function move(direction: number) {
    if (locked) return;
    const next = addDays(week, direction*7);
    if (next > END || addDays(next,6) < START) return;
    anchor = next < START ? START : next; void loadWeek();
  }
  function saveNotes() {
    const values = [week,notes];
    void persist(`notes:${week}`, () => writePlanner('INSERT INTO weekly_planner_notes(week_start,body) VALUES($1,$2) ON CONFLICT(week_start) DO UPDATE SET body=excluded.body', values));
  }
  function toggleCalendar(todo: CalendarTodo) {
    todo.checked = todo.checked ? 0 : 1;
    const line = { ...todo, section: 'todo' as const };
    void persist(`calendar:${todo.plan_date}:${todo.position}`, () => saveLine(line));
  }
  function saveTask(task: WeeklyTask) {
    const values = [task.id,task.week_start,task.title,task.checked];
    void persist(`task:${task.id}`, () => writePlanner('INSERT INTO weekly_planner_tasks(id,week_start,title,checked) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET title=excluded.title,checked=excluded.checked',values));
  }
  async function removeCalendarTodo(todo: CalendarTodo) {
    if (locked || deleting) return;
    deleting = true;
    await persist(`calendar:${todo.plan_date}:${todo.position}`, async () => {
      await deleteTodo(todo.plan_date,todo.position);
      todos = todos.filter(t => t.plan_date !== todo.plan_date || t.position !== todo.position);
    });
    deleting = false;
  }
  async function removeWeeklyTask(task: WeeklyTask) {
    if (locked || deleting) return;
    deleting = true;
    await persist(`task:${task.id}`, async () => {
      await writePlanner('DELETE FROM weekly_planner_tasks WHERE id=$1',[task.id]);
      tasks = tasks.filter(t => t.id !== task.id);
    });
    deleting = false;
  }
  function addTask() { const task = { id: crypto.randomUUID(),week_start:week,title:'',checked:0 }; tasks = [...tasks,task]; saveTask(task); }
  function retry() { if (!ready) void loadWeek(); else for (const [key,job] of Object.entries(failed)) void persist(key,job.run); }
</script>

<section class="calendar-shell weekly-planner" aria-label="Weekly planner">
  <header class="calendar-toolbar"><h1>Weekly planner</h1><span class="planner-state" role="status">{loading ? 'Opening week…' : pending ? 'Saving…' : ready && !error ? 'Saved on this Mac' : ''}</span></header>
  {#if error}<div class="calendar-notice" role="alert">{error}{#if isTauri()} <button disabled={pending > 0 || loading} onclick={retry}>Retry</button>{/if}</div>{/if}
  <div class="week-planner-layout">
    <section class="planner-day-boxes" aria-label="Days of the week">
      {#each days as day}
        <div class="planner-day-row" class:outside={!supported(day)}>
          <button class="planner-date-link" disabled={!supported(day) || locked} onclick={() => onopen(day)} aria-label={`Open daily planner for ${fullDate(day)}`}><strong>{new Date(day+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}</strong><span>{new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></button>
          <div class="planner-day-content">
            {#each dayNotes.filter(note=>note.plan_date===day) as note}<textarea class="planner-day-note" use:autosize={note.body} aria-label={`${fullDate(day)} daily notes`} value={note.body} oninput={(e) => { note.body = e.currentTarget.value; saveDayNote(note); }} disabled={!ready || deleting} spellcheck="false"></textarea>{/each}
            <div class="planner-day-todos" aria-label={`${fullDate(day)} to-do list`}>{#each todos.filter(t=>t.plan_date===day && (t.text.trim() || t.checked)) as todo}<div class="planner-day-todo"><button class="pixel-checkbox" role="checkbox" aria-checked={!!todo.checked} aria-label={todo.text || 'Unnamed task'} disabled={!ready || deleting} onclick={()=>toggleCalendar(todo)}><svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="white" d="M1 1h14v14H1z"/><path fill="#17171b" d="M3 3h10v10H3z"/>{#if todo.checked}<path fill="white" d="M3 7h2v2h2V7h2V5h2V3h2v4h-2v2H9v2H7v2H5v-2H3z"/>{/if}</svg></button><span>{todo.text || 'Unnamed task'}</span><DeleteTodoButton label={`Delete ${todo.text || 'unnamed to-do'}`} disabled={!ready || locked || deleting} onclick={()=>removeCalendarTodo(todo)}/></div>{:else}<span class="planner-day-empty">No to-dos</span>{/each}</div>
          </div>
        </div>
      {/each}
    </section>
    <div class="week-planner-sidebar">
      <section class="planner-week-todos"><h2>Weekly to do list</h2>
        {#each tasks as task}<div class="planner-task-row"><button class="pixel-checkbox" role="checkbox" aria-checked={!!task.checked} aria-label={task.title || 'Weekly task'} disabled={!ready || deleting} onclick={() => { task.checked = task.checked ? 0 : 1; saveTask(task); }}><svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="white" d="M1 1h14v14H1z"/><path fill="#17171b" d="M3 3h10v10H3z"/>{#if task.checked}<path fill="white" d="M3 7h2v2h2V7h2V5h2V3h2v4h-2v2H9v2H7v2H5v-2H3z"/>{/if}</svg></button><input aria-label="Weekly task name" value={task.title} oninput={(e) => { task.title = e.currentTarget.value; saveTask(task); }} disabled={!ready || deleting} placeholder=""/><DeleteTodoButton label={`Delete ${task.title || 'unnamed to-do'}`} disabled={!ready || locked || deleting} onclick={() => removeWeeklyTask(task)}/></div>{/each}
        {#if !tasks.length}<p class="planner-empty">Your weekly tasks will appear here.</p>{/if}
        <button class="planner-add-task" disabled={!ready || deleting} onclick={addTask}>+ Add weekly task</button>
      </section>
      <section class="planner-week-notes"><h2>Notes</h2><textarea use:autosize={notes} aria-label="Weekly notes" value={notes} oninput={(e) => { notes = e.currentTarget.value; saveNotes(); }} disabled={!ready || deleting} spellcheck="false"></textarea></section>
    </div>
  </div>
  <div class="navigation-source"><footer use:dockNavigation class="calendar-bottom"><div class="calendar-navigation">
    <button class="triangle-button" aria-label="Previous week" disabled={locked || days[0] <= START} onclick={() => move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M19 2v20L3 12z"/><path fill="white" d="M17 0v20L1 10z"/></svg></button>
    <h2 aria-live="polite">{range}</h2>
    <button class="triangle-button" aria-label="Next week" disabled={locked || days[6] >= END} onclick={() => move(1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M3 2v20l16-10z"/><path fill="white" d="M1 0v20l16-10z"/></svg></button>
    <TodayButton label="Return to this week" disabled={locked} onclick={() => { const now = localKey(new Date()); anchor = now < START ? START : now > END ? END : now; void loadWeek(); }}/>
  </div></footer></div>
</section>
