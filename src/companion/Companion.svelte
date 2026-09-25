<script lang="ts">
  import { onMount } from 'svelte';
  import logo from '../../public/art/krmf-logo.png';
  import PixelIcon from '../lib/components/PixelIcon.svelte';
  import ThemeIcon from '../lib/components/ThemeIcon.svelte';

  import {
    START,
    END,
    localKey,
    fullDate,
    monthCells,
    WEEKDAYS,
    COLORS
  } from '../modules/calendar/model.ts';

  import {
    addDays,
    weekStart,
    weekDates,
    timeText,
    expandSeries,
    dayWindow,
    plannerBlocks
  } from '../modules/calendar/weekly-model.ts';

  import type { CalendarEvent } from '../modules/calendar/model.ts';
  import type { TimedSeries } from '../modules/calendar/weekly-model.ts';

  import {
    scheduled,
    habitScore,
    HABIT_DAYS
  } from '../modules/habits/model.ts';

  import type { Habit, Checkin } from '../modules/habits/model.ts';

  import {
    emptyState,
    edit,
    recordId,
    type Row
  } from './sync.ts';

  import { record } from './schema.ts';

  import {
    initialize,
    save,
    read,
    choose,
    synchronize,
    isPreview
  } from './store.ts';

  let notebook = $state(emptyState());
  let ready = $state(false);
  let busy = $state(false);
  let error = $state('');

  let message = $state('Opening your notebook…');

  let date = $state(
    [START, localKey(new Date()), END].sort()[1]
  );

  let view = $state(
    ['day', 'week', 'habits', 'calendar', 'schedule'].includes(
      location.hash.slice(1)
    )
      ? location.hash.slice(1)
      : 'day'
  );

  let light = $state(
    localStorage.getItem('krmf-companion-theme') === 'light'
  );

  let drafts = $state<
    Record<
      string,
      {
        table: string;
        row: Row;
        deleted: boolean;
        token: string;
      }
    >
  >({});

  let newHabit = $state('');
  let mask = $state(127);
  let newImportantTitle = $state('');
  let slotDrafts = $state<Record<string,string>>({});
  let scheduleDialog: HTMLDialogElement;
  let editingBlock = $state<ReturnType<typeof scheduleBlocks>[number] | null>(null);
  let editingDay = $state('');
  let eventTitle = $state('');
  let eventDate = $state('');
  let eventStart = $state('09:00');
  let eventEnd = $state('10:00');
  let eventColor = $state<keyof typeof COLORS>('blue');
  let eventRepeats = $state(false);
  let eventUntil = $state(END);

  let selectedCalendarDay = $state<string | null>(null);

  const week = $derived(weekStart(date));
  const entries = $derived(Object.values(notebook.entries));

  const conflicts = $derived(
    Object.entries(notebook.entries).filter(([, e]) => e.conflict)
  );

  const count = $derived(
    entries.filter(e => e.pending).length
  );

  const rows = (table: string): Row[] =>
    entries
      .filter(e => e.remote.table === table && e.value)
      .map(e => e.value!);

  const lines = $derived(
    rows('day_planner_lines').filter(r => r.plan_date === date)
  );

  const tasks = $derived(
    lines
      .filter(r => r.section === 'todo')
      .sort((a, b) => Number(a.position) - Number(b.position))
  );

  const weekly = $derived(
    rows('weekly_planner_tasks').filter(
      r => r.week_start === week
    )
  );

  const habits = $derived(
    rows('habits') as unknown as Habit[]
  );

  const checkins = $derived(
    rows('habit_checkins') as unknown as Checkin[]
  );

  const month = $derived(
    new Date(date + 'T12:00:00')
  );

  const occurrences = $derived(
    expandSeries(
      rows('timed_event_series') as unknown as TimedSeries[]
    )
  );

  const scheduleDays = $derived(
    weekDates(date)
  );

  const scheduleEvents = $derived([
    ...(rows('calendar_events') as unknown as CalendarEvent[]),
    ...occurrences
  ]);

  const todayKey = () =>
    [START, localKey(new Date()), END].sort()[1];

  function importantEvents(day: string): Row[] {
    return rows('important_events').filter(
      r => r.event_date === day
    );
  }

  function tab(next: string) {
    view = next;
    location.hash = next;
  }

  function openDay(day: string) {
    date = day;
    tab('day');
  }

  function returnToCurrentPeriod() {
    date = todayKey();

    if (view === 'calendar') {
      selectedCalendarDay = date;
    }
  }

  function shiftMonth(amount: number) {
    const current = new Date(`${date}T12:00:00`);

    const originalDay = current.getDate();

    const target = new Date(
      current.getFullYear(),
      current.getMonth() + amount,
      1,
      12
    );

    const lastDay = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();

    target.setDate(Math.min(originalDay, lastDay));

    let next = localKey(target);

    if (next < START) next = START;
    if (next > END) next = END;

    date = next;
    selectedCalendarDay = null;
  }

  function previousPeriod() {
    if (view === 'calendar') {
      shiftMonth(-1);
      return;
    }

    date = addDays(
      date,
      view === 'week' || view === 'schedule' ? -7 : -1
    );
  }

  function nextPeriod() {
    if (view === 'calendar') {
      shiftMonth(1);
      return;
    }

    date = addDays(
      date,
      view === 'week' || view === 'schedule' ? 7 : 1
    );
  }

  const scheduleBlocks = (day: string) =>
    [
      ...scheduleEvents.filter(
        e =>
          !e.all_day &&
          new Date(e.starts_at) <
            new Date(`${addDays(day, 1)}T00:00:00`) &&
          new Date(e.ends_at) >
            new Date(`${day}T00:00:00`)
      ),

      ...plannerBlocks(
        rows('day_planner_lines') as any,
        day
      )
    ]
      .map(event => ({
        event,
        ...dayWindow(event, day)
      }))
      .filter(
        block =>
          block.end > 480 &&
          block.start < 1380
      );

  const blockColor=(event:CalendarEvent)=>event.id.startsWith('slot:') ? '#dddddd' : (COLORS as Record<string,string>)[String((event as any).color ?? 'blue')] ?? COLORS.blue;

  const timeValue=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
  const parseTime=(text:string)=>{const [h,m]=text.split(':').map(Number);return h*60+m;};
  function openScheduleEditor(block:ReturnType<typeof scheduleBlocks>[number],day:string){
    const original=rows('timed_event_series').find(r=>r.id===(block.event as any).series_id);
    editingBlock=block;editingDay=day;eventTitle=String(original?.title ?? block.event.title);eventDate=String(original?.first_date ?? day);
    eventStart=timeValue(Number(original?.start_minute ?? block.start));eventEnd=timeValue(Number(original?.end_minute ?? block.end));
    eventColor=(String(original?.color ?? (block.event as any).color ?? 'blue') as keyof typeof COLORS);eventRepeats=!!original?.repeat_until;eventUntil=String(original?.repeat_until ?? END);scheduleDialog.showModal();
  }
  function openNewScheduleEvent(day:string,minute:number){editingBlock=null;editingDay=day;eventTitle='';eventDate=day;eventStart=timeValue(minute);eventEnd=timeValue(Math.min(minute+60,1439));eventColor='blue';eventRepeats=false;eventUntil=END;scheduleDialog.showModal();}
  async function saveScheduleEvent(e:SubmitEvent){
    e.preventDefault();if(!eventTitle.trim()||parseTime(eventEnd)<=parseTime(eventStart))return;
    const original=editingBlock ? rows('timed_event_series').find(r=>r.id===(editingBlock!.event as any).series_id) : undefined;
    const manual=!!editingBlock?.event.id.startsWith('slot:');
    if(original){await persist('timed_event_series',{...original,title:eventTitle.trim(),first_date:eventDate,start_minute:parseTime(eventStart),end_minute:parseTime(eventEnd),repeat_until:eventRepeats?eventUntil:null,color:eventColor});}
    else if(editingBlock&&!manual){const old=rows('calendar_events').find(r=>r.id===editingBlock!.event.id);if(old){const start=new Date(`${eventDate}T${eventStart}:00`),end=new Date(`${eventDate}T${eventEnd}:00`);await persist('calendar_events',{...old,title:eventTitle.trim(),starts_at:start.toISOString(),ends_at:end.toISOString()});}}
    else {const id=crypto.randomUUID(),first=editingBlock?Math.floor(editingBlock.start/30)-16:null,last=editingBlock?Math.ceil(editingBlock.end/30)-17:null;await persist('timed_event_series',{id,title:eventTitle.trim(),first_date:eventDate,start_minute:parseTime(eventStart),end_minute:parseTime(eventEnd),repeat_until:eventRepeats?eventUntil:null,color:eventColor,excluded_dates:'[]',source_date:manual?editingDay:null,source_first:manual?first:null,source_last:manual?last:null,source_text:manual?editingBlock!.event.title:null,source_event_id:null});if(manual&&first!==null&&last!==null)for(let position=first;position<=last;position++){const row=slotFor(editingDay,position);if(String(row.text).trim()===editingBlock!.event.title)await persist('day_planner_lines',row,true);}}
    scheduleDialog.close();
  }
  async function deleteScheduleEvent(whole=false){
    if(!editingBlock)return;const series=rows('timed_event_series').find(r=>r.id===(editingBlock!.event as any).series_id);
    if(series&&series.repeat_until&&!whole){const excluded=JSON.parse(String(series.excluded_dates??'[]')) as string[];if(!excluded.includes(editingDay))excluded.push(editingDay);await persist('timed_event_series',{...series,excluded_dates:JSON.stringify(excluded)});}
    else if(series)await persist('timed_event_series',series,true);
    else if(editingBlock.event.id.startsWith('slot:')){for(let position=Math.floor(editingBlock.start/30)-16;position<=Math.ceil(editingBlock.end/30)-17;position++){const row=slotFor(editingDay,position);if(String(row.text).trim()===editingBlock.event.title)await persist('day_planner_lines',row,true);}}
    else {const row=rows('calendar_events').find(r=>r.id===editingBlock!.event.id);if(row)await persist('calendar_events',row,true);}scheduleDialog.close();
  }
  async function commitSlot(day:string,position:number,row:Row,e:KeyboardEvent){if(e.key!=='Enter')return;e.preventDefault();const key=`${day}:${position}`,text=slotDrafts[key]??'';if(!text.trim())return;await persist('day_planner_lines',{...row,text:text.trim()});delete slotDrafts[key];}

  const eventNames = (day: string) => [
    ...rows('important_events')
      .filter(r => r.event_date === day)
      .map(r => String(r.title)),

    ...rows('calendar_events')
      .filter(
        r =>
          String(r.starts_at).slice(0, 10) <= day &&
          String(r.ends_at).slice(0, 10) > day
      )
      .map(r => String(r.title)),

    ...occurrences
      .filter(
        r =>
          localKey(new Date(r.starts_at)) === day
      )
      .map(r => {
        const start = new Date(r.starts_at);

        return `${timeText(
          start.getHours() * 60 + start.getMinutes()
        )} ${r.title}`;
      })
  ];

  const note = (
    table: string,
    key: string,
    value: string
  ) =>
    String(
      rows(table).find(r => r[key] === value)?.body ?? ''
    );

  function theme() {
    document.documentElement.dataset.theme =
      light ? 'light' : 'dark';

    localStorage.setItem(
      'krmf-companion-theme',
      light ? 'light' : 'dark'
    );
  }

  async function persist(
    table: string,
    row: Row,
    deleted = false
  ) {
    const r = record(table, row);
    const id = recordId(table, r.key);
    const token = crypto.randomUUID();

    drafts[id] = {
      table,
      row,
      deleted,
      token
    };

    try {
      const saved = await save(
        table,
        row,
        deleted
      );

      if (drafts[id]?.token === token) {
        delete drafts[id];
      }

      for (const draft of Object.values(drafts)) {
        const rec = record(
          draft.table,
          draft.row
        );

        edit(saved, {
          ...rec,
          data: draft.deleted
            ? null
            : draft.row
        });
      }

      notebook = saved;

      message = isPreview
        ? 'Saved in this test notebook'
        : 'Saved on this device';

      error = '';
    } catch {
      error =
        'Some edits are still unsaved. Keep this page open and press Retry saving.';
    }
  }

  async function retryDrafts() {
    for (const draft of Object.values(drafts)) {
      await persist(
        draft.table,
        draft.row,
        draft.deleted
      );
    }
  }

  const value = (e: Event) =>
    (e.currentTarget as HTMLInputElement | HTMLTextAreaElement)
      .value;

  function slotFor(
    day: string,
    position: number
  ): Row {
    return (
      rows('day_planner_lines').find(
        r =>
          r.plan_date === day &&
          r.section === 'slot' &&
          Number(r.position) === position
      ) ?? {
        plan_date: day,
        section: 'slot',
        position,
        text: '',
        checked: 0
      }
    );
  }

  async function sync() {
    if (
      busy ||
      Object.keys(drafts).length
    ) {
      return;
    }

    busy = true;

    try {
      notebook = await synchronize();

      message = isPreview
        ? 'Preview only · no server connected'
        : 'Sync complete';

      error = '';
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  async function settle(
    id: string,
    choice: 'local' | 'remote'
  ) {
    try {
      notebook = await choose(
        id,
        choice
      );
    } catch (e) {
      error = String(e);
    }
  }

  async function sample() {
    if (entries.length) return;

    await persist(
      'day_planner_lines',
      {
        plan_date: date,
        section: 'slot',
        position: 2,
        text: 'Focus time',
        checked: 0
      }
    );

    await persist(
      'day_planner_lines',
      {
        plan_date: date,
        section: 'todo',
        position: 1,
        text: 'Pack a notebook',
        checked: 0
      }
    );

    await persist(
      'weekly_planner_tasks',
      {
        id: crypto.randomUUID(),
        week_start: week,
        title: 'Plan a little adventure',
        checked: 0,
        created_at: new Date().toISOString()
      }
    );

    await persist(
      'habits',
      {
        id: crypto.randomUUID(),
        title: 'Read a few pages',
        weekday_mask: 127,
        starts_on: date,
        created_at: new Date().toISOString()
      }
    );
  }

  async function addHabit(
    e: SubmitEvent
  ) {
    e.preventDefault();

    if (
      !newHabit.trim() ||
      !mask
    ) {
      return;
    }

    await persist(
      'habits',
      {
        id: crypto.randomUUID(),
        title: newHabit.trim(),
        weekday_mask: mask,
        starts_on: date,
        created_at: new Date().toISOString()
      }
    );

    newHabit = '';
  }

  async function deleteHabit(
    habit: Habit
  ) {
    /*
     * Keep check-ins as recoverable records.
     * They remain hidden while their parent habit is a tombstone.
     */
    await persist(
      'habits',
      habit as unknown as Row,
      true
    );
  }

  async function addImportantEvent() {
    if (!selectedCalendarDay || !newImportantTitle.trim()) return;
    await persist('important_events', {
      id: crypto.randomUUID(),
      event_date: selectedCalendarDay,
      title: newImportantTitle.trim(),
      color: 'blue',
      created_at: new Date().toISOString()
    });
    newImportantTitle = '';
  }

  onMount(() => {
    const guard = (
      event: BeforeUnloadEvent
    ) => {
      if (
        Object.keys(drafts).length
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener(
      'beforeunload',
      guard
    );

    theme();

    void initialize()
      .then(s => {
        notebook = s;
        ready = true;

        message = isPreview
          ? 'Test notebook · separate from your Mac'
          : 'Your private notebook';
      })
      .catch(e => {
        error = String(e);
      });

    const refresh = () => {
      if (
        ready &&
        !Object.keys(drafts).length
      ) {
        void read().then(
          s => notebook = s
        );
      }
    };

    window.addEventListener(
      'focus',
      refresh
    );

    const timer = setInterval(
      () => {
        if (
          ready &&
          !isPreview &&
          navigator.onLine
        ) {
          void sync();
        }
      },
      30000
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        guard
      );

      clearInterval(timer);

      window.removeEventListener(
        'focus',
        refresh
      );
    };
  });
</script>

<div class="pocket">
  <header class="masthead">
    <a
      href="#day"
      onclick={() => tab('day')}
      aria-label="KRMF home"
    >
      <img
        src={logo}
        alt="KRMF"
      />
    </a>

    <div>
      <p>
        you know efe been pimpin
      </p>
    </div>

    <button
      class="theme"
      aria-label={light ? 'Use dark theme' : 'Use light theme'}
      onclick={() => {
        light = !light;
        theme();
      }}
    >
      <ThemeIcon {light}/>
    </button>
  </header>

  {#if isPreview}
    <div class="preview-banner">
      TEST-DATA PREVIEW · Your Mac and website are untouched.
    </div>
  {/if}

  <nav
    class="tabs"
    aria-label="Notebook sections"
  >
    {#each [
      { id: 'day', name: 'Today', icon: 'planner' },
      { id: 'week', name: 'This week', icon: 'planner' },
      { id: 'habits', name: 'Habits', icon: 'habits' },
      { id: 'calendar', name: 'Calendar', icon: 'calendar' },
      { id: 'schedule', name: 'Schedule', icon: 'calendar' }
    ] as item}
      <a
        href={'#' + item.id}
        class:chosen={view === item.id}
        aria-current={view === item.id ? 'page' : undefined}
        onclick={() => tab(item.id)}
      >
        <span class="nav-icon">
          <PixelIcon kind={item.icon}/>
        </span>

        {item.name}
      </a>
    {/each}
  </nav>

  <main>
    <div class="date-bar">
      <button
        aria-label="Previous period"
        disabled={date <= START}
        onclick={previousPeriod}
      >
        ←
      </button>

      <label>
        <span>
          {view === 'week' || view === 'schedule'
            ? 'WEEK OF ' + week
            : view === 'calendar'
              ? month.toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    year: 'numeric'
                  }
                )
              : fullDate(date)}
        </span>

        <input
          aria-label="Choose date"
          type="date"
          min={START}
          max={END}
          bind:value={date}
        />
      </label>

      <button
        aria-label="Next period"
        disabled={date >= END}
        onclick={nextPeriod}
      >
        →
      </button>

      <button
        class="return-current"
        onclick={returnToCurrentPeriod}
      >
        {view === 'calendar'
          ? 'This month'
          : view === 'week' || view === 'schedule'
            ? 'This week'
            : 'Today'}
      </button>
    </div>

    <div
      class="status"
      role="status"
    >
      <span>
        {message}
        {count
          ? ` · ${count} ${isPreview ? 'local edits' : 'pending'}`
          : ''}
      </span>

      <button
        disabled={!ready || busy || isPreview}
        onclick={sync}
      >
        {busy ? 'Syncing…' : 'Sync'}
      </button>
    </div>

    {#if error}
      <p
        class="error"
        role="alert"
      >
        {error}

        {#if Object.keys(drafts).length}
          <button onclick={retryDrafts}>
            Retry saving
          </button>
        {/if}
      </p>
    {/if}

    {#if ready && isPreview && !entries.length}
      <section class="sheet welcome">
        <h1>
          KRMF
        </h1>

        <p>
          Try a daily plan, a weekly to-do, and a little habit.
          Everything here is test data saved in this browser.
        </p>

        <button onclick={sample}>
          Open a sample notebook
        </button>
      </section>
    {/if}

    {#if conflicts.length}
      <section class="sheet conflicts">
        <h2>
          Two edits need your attention
        </h2>

        <p>
          Both versions are retained until you choose.
          Export a backup to keep a copy of both.
        </p>

        {#each conflicts as [id, entry]}
          <article>
            <h3>
              {entry.remote.table}
            </h3>

            <div class="versions">
              <div>
                <strong>
                  This device
                </strong>

                <pre>{JSON.stringify(entry.value, null, 2)}</pre>
              </div>

              <div>
                <strong>
                  Other device
                </strong>

                <pre>{JSON.stringify(entry.conflict?.data, null, 2)}</pre>
              </div>
            </div>

            <button onclick={() => settle(id, 'local')}>
              Keep this device’s version
            </button>

            <button onclick={() => settle(id, 'remote')}>
              Keep other version
            </button>
          </article>
        {/each}
      </section>
    {/if}

    {#if view === 'day'}
      {#if eventNames(date).length}
        <section class="sheet">
          <h2>
            On the calendar
          </h2>

          {#each eventNames(date) as title}
            <p>
              {title}
            </p>
          {/each}
        </section>
      {/if}

      <section class="sheet daily-schedule-sheet">
        <h1>
          Daily schedule
          <span>
            YOUR DAY AT A GLANCE
          </span>
        </h1>

        <div class="web-day-scroll">
          <div class="web-day">
            <div class="web-day-head">
              <span></span>

              <div>
                <small>
                  {new Date(
                    date + 'T12:00:00'
                  ).toLocaleDateString(
                    'en-US',
                    { weekday: 'short' }
                  )}
                </small>

                <strong>
                  {Number(date.slice(-2))}
                </strong>
              </div>
            </div>

            <div class="web-day-all-day">
              <span>
                ALL DAY
              </span>

              <div>
                {#each importantEvents(date) as item}
                  <b>
                    {item.title}
                  </b>
                {/each}

                {#each scheduleEvents.filter(
                  e =>
                    e.all_day &&
                    String(e.starts_at).slice(0, 10) <= date &&
                    String(e.ends_at).slice(0, 10) > date
                ) as item}
                  <b>
                    {item.title}
                  </b>
                {/each}
              </div>
            </div>

            <div class="web-day-grid">
              <div class="web-week-hours">
                {#each Array(16) as _, i}
                  <span
                    style:top={`${i / 15 * 100}%`}
                  >
                    {timeText((i + 8) * 60)}
                  </span>
                {/each}
              </div>

              <div class="web-day-column">
                <div class="web-day-slot-layer">
                  {#each Array.from({ length: 30 }, (_, i) => i) as position}
                    {@const row = slotFor(date, position)}
                    {@const draftKey = `${date}:${position}`}

                    {#if row.text}<span aria-hidden="true"></span>{:else}<input disabled={!ready} aria-label={`${timeText((position + 16) * 30)} plan`} maxlength="20" value={slotDrafts[draftKey]??''} oninput={e=>slotDrafts[draftKey]=value(e)} onkeydown={e=>commitSlot(date,position,row,e)} placeholder=""/>{/if}
                  {/each}
                </div>

                <div class="web-day-event-layer">
                  {#each scheduleBlocks(date) as block}
                    <button
                      class="web-week-event web-day-calendar-event"
                      class:editable={block.event.id.startsWith('slot:')}
                      style:--block-color={blockColor(block.event)}
                      onclick={()=>openScheduleEditor(block,date)}
                      style:top={`${(Math.max(block.start, 480) - 480) / 900 * 100}%`}
                      style:height={`${Math.max(
                        2,
                        (Math.min(block.end, 1380) -
                          Math.max(block.start, 480)) /
                          900 *
                          100
                      )}%`}
                    >
                      <strong>
                        {block.event.title}
                      </strong>

                      <small>
                        {timeText(block.start)}
                      </small>
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="daily-support-layout">
        <section class="sheet">
          <h2>
            Daily to-dos
          </h2>

          {#each tasks as task}
            <div class="task">
              <input
                type="checkbox"
                aria-label={'Complete ' + task.text}
                checked={!!task.checked}
                onchange={() =>
                  persist(
                    'day_planner_lines',
                    {
                      ...task,
                      checked: task.checked ? 0 : 1
                    }
                  )
                }
              />

              <input
                aria-label="Daily to-do title"
                maxlength="20"
                value={String(task.text)}
                oninput={e =>
                  persist(
                    'day_planner_lines',
                    {
                      ...task,
                      text: value(e)
                    }
                  )
                }
              />

              <button
                class="delete"
                aria-label={'Delete ' + task.text}
                onclick={() =>
                  persist(
                    'day_planner_lines',
                    task,
                    true
                  )
                }
              >
                ×
              </button>
            </div>
          {/each}

          <button
            class="add"
            disabled={!ready}
            onclick={() =>
              persist(
                'day_planner_lines',
                {
                  plan_date: date,
                  section: 'todo',
                  position:
                    Date.now() * 1000 +
                    crypto.getRandomValues(
                      new Uint16Array(1)
                    )[0] %
                      1000,
                  text: '',
                  checked: 0
                }
              )
            }
          >
            + Add a to-do
          </button>
        </section>

        <section class="sheet">
          <h2>
            Notes to self
          </h2>

          <textarea
            disabled={!ready}
            aria-label="Daily notes"
            value={note(
              'daily_notes',
              'plan_date',
              date
            )}
            oninput={e =>
              persist(
                'daily_notes',
                {
                  plan_date: date,
                  body: value(e)
                }
              )
            }
            placeholder="Leave a thought here…"
          ></textarea>
        </section>
      </div>

    {:else if view === 'week'}
      <section class="sheet">
        <h1>
          This week’s little list
        </h1>

        {#each weekly as task}
          <div class="task">
            <input
              type="checkbox"
              aria-label={'Complete ' + task.title}
              checked={!!task.checked}
              onchange={() =>
                persist(
                  'weekly_planner_tasks',
                  {
                    ...task,
                    checked: task.checked ? 0 : 1
                  }
                )
              }
            />

            <input
              aria-label="Weekly to-do title"
              value={String(task.title)}
              oninput={e =>
                persist(
                  'weekly_planner_tasks',
                  {
                    ...task,
                    title: value(e)
                  }
                )
              }
            />

            <button
              class="delete"
              aria-label={'Delete ' + task.title}
              onclick={() =>
                persist(
                  'weekly_planner_tasks',
                  task,
                  true
                )
              }
            >
              ×
            </button>
          </div>
        {/each}

        <button
          class="add"
          disabled={!ready}
          onclick={() =>
            persist(
              'weekly_planner_tasks',
              {
                id: crypto.randomUUID(),
                week_start: week,
                title: '',
                checked: 0,
                created_at:
                  new Date().toISOString()
              }
            )
          }
        >
          + Add a weekly to-do
        </button>
      </section>

      <section class="sheet">
        <h2>
          Daily to-dos this week
        </h2>

        {#each weekDates(date).filter(
          d => d >= START && d <= END
        ) as day}
          <div class="week-day">
            <a
              href="#day"
              onclick={() => openDay(day)}
            >
              {fullDate(day)}
            </a>

            {#each rows('day_planner_lines').filter(
              r =>
                r.section === 'todo' &&
                r.plan_date === day
            ) as task}
              <label class="task">
                <input
                  type="checkbox"
                  checked={!!task.checked}
                  onchange={() =>
                    persist(
                      'day_planner_lines',
                      {
                        ...task,
                        checked:
                          task.checked ? 0 : 1
                      }
                    )
                  }
                />

                <span>
                  {task.text || 'Untitled to-do'}
                </span>
              </label>
            {/each}           
              <textarea
              disabled={!ready}
              aria-label={`Notes for ${fullDate(day)}`}
              value={note(
                'daily_notes',
                'plan_date',
                day
              )}
              oninput={e =>
                persist(
                  'daily_notes',
                  {
                    plan_date: day,
                    body: value(e)
                  }
                )
              }
              placeholder="Daily notes…"
            ></textarea>
          </div>
        {/each}
      </section>

      <section class="sheet">
        <h2>
          Weekly notes
        </h2>

        <textarea
          disabled={!ready}
          aria-label="Weekly notes"
          value={note(
            'weekly_planner_notes',
            'week_start',
            week
          )}
          oninput={e =>
            persist(
              'weekly_planner_notes',
              {
                week_start: week,
                body: value(e)
              }
            )
          }
        ></textarea>
      </section>

    {:else if view === 'habits'}
      <section class="sheet">
        <h1>
          Little habits, growing days
        </h1>

        <p class="muted">
          Check in for {fullDate(date)}.
        </p>

        {#each habits as habit}
          {@const done = checkins.some(
            c =>
              c.habit_id === habit.id &&
              c.checkin_date === date
          )}

          {@const score = habitScore(
            habit,
            checkins,
            date
          )}

          <article class="habit">
            <button
              class="habit-toggle"
              disabled={!scheduled(habit, date)}
              aria-pressed={done}
              onclick={() =>
                persist(
                  'habit_checkins',
                  {
                    habit_id: habit.id,
                    checkin_date: date
                  },
                  done
                )
              }
            >
              <span class="check">
                {done ? '✓' : ''}
              </span>

              <span>
                {habit.title}

                <small>
                  {scheduled(habit, date)
                    ? `${score.current} day streak · ${score.total} check-ins`
                    : 'A day off. Rest counts too.'}
                </small>
              </span>
            </button>

            <button
              class="delete"
              aria-label={'Delete ' + habit.title}
              onclick={() => deleteHabit(habit)}
            >
              ×
            </button>
          </article>
        {:else}
          <p>
            Your first habit starts the story.
          </p>
        {/each}
      </section>

      <section class="sheet">
        <h2>
          A new little habit
        </h2>

        <form onsubmit={addHabit}>
          <input
            aria-label="Habit name"
            maxlength="80"
            required
            bind:value={newHabit}
            placeholder="Read a few pages…"
          />

          <fieldset>
            <legend>
              Which days?
            </legend>

            <div class="weekdays">
              {#each HABIT_DAYS as day}
                <button
                  type="button"
                  aria-pressed={!!(mask & day.bit)}
                  onclick={() => mask ^= day.bit}
                >
                  {day.name}
                </button>
              {/each}
            </div>
          </fieldset>

          <button
            disabled={
              !ready ||
              !mask ||
              !newHabit.trim()
            }
          >
            + Add habit
          </button>
        </form>
      </section>

    {:else if view === 'calendar'}
      <section class="sheet">
        <h1>
          {month.toLocaleDateString(
            'en-US',
            {
              month: 'long',
              year: 'numeric'
            }
          )}
        </h1>

        <p class="muted">
          Select a day to see its important events.
        </p>

        <div class="month-grid">
          {#each WEEKDAYS as day}
            <span class="weekday">
              {day.slice(0, 1)}
            </span>
          {/each}

          {#each monthCells(
            month.getFullYear(),
            month.getMonth()
          ) as day}
            {#if day}
              <button
                type="button"
                class:today={day === todayKey()}
                class:selected={
                  day === selectedCalendarDay
                }
                onclick={() => {
                  selectedCalendarDay = day;
                  date = day;
                }}
              >
                {Number(day.slice(-2))}

                {#if importantEvents(day).length}
                  <i
                    aria-label="Has important events"
                  ></i>
                {/if}
              </button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
      </section>

      {#if selectedCalendarDay}
        <section class="sheet calendar-day-detail">
          <button
            class="calendar-day-link"
            onclick={() =>
              openDay(selectedCalendarDay!)
            }
          >
            <strong>
              {fullDate(selectedCalendarDay)}
            </strong>

            <span>
              Open daily planner →
            </span>
          </button>

          <h2>
            Important events
          </h2>

          {#if importantEvents(selectedCalendarDay).length}
            {#each importantEvents(selectedCalendarDay) as item}
              <p class="calendar-important-event">
                <i></i>
                <span>
                  {item.title}
                </span>
                <button class="delete" aria-label={'Delete '+item.title} onclick={()=>persist('important_events',item,true)}>×</button>
              </p>
            {/each}
          {:else}
            <p class="muted">
              No important events for this day.
            </p>
          {/if}
          <div class="important-event-add"><input maxlength="120" bind:value={newImportantTitle} placeholder="Important event…" aria-label="Important event name"/><button disabled={!ready || !newImportantTitle.trim()} onclick={addImportantEvent}>+ Add</button></div>
        </section>
      {/if}

    {:else}
      <section class="sheet weekly-sheet">
        <h1>
          Weekly schedule
        </h1>

        <p class="muted">
          Your Mac calendar schedule, planner and notes,
          synced to this week.
        </p>

        <div class="web-week-scroll">
          <div class="web-week">
            <div class="web-week-head">
              <span></span>

              {#each scheduleDays as day}
                <div class="web-week-day-head">
                  <a
                    href="#day"
                    onclick={() => openDay(day)}
                  >
                    <small>
                      {new Date(
                        day + 'T12:00:00'
                      ).toLocaleDateString(
                        'en-US',
                        { weekday: 'short' }
                      )}
                    </small>

                    <strong>
                      {Number(day.slice(-2))}
                    </strong>
                  </a>
                </div>
              {/each}
            </div>

            <div class="web-week-all-day">
              <span>
                ALL DAY
              </span>

              {#each scheduleDays as day}
                <div>
                  {#each importantEvents(day) as item}
                    <b>
                      {item.title}
                    </b>
                  {/each}

                  {#each scheduleEvents.filter(
                    e =>
                      e.all_day &&
                      String(e.starts_at).slice(0, 10) <= day &&
                      String(e.ends_at).slice(0, 10) > day
                  ) as item}
                    <b>
                      {item.title}
                    </b>
                  {/each}
                </div>
              {/each}
            </div>

            <div class="web-week-grid">
              <div class="web-week-hours">
                {#each Array(16) as _, i}
                  <span
                    style:top={`${i / 15 * 100}%`}
                  >
                    {timeText((i + 8) * 60)}
                  </span>
                {/each}
              </div>

              {#each scheduleDays as day}
                <div class="web-week-day">
                  {#each Array.from({length:30},(_,i)=>i) as half}<button class="web-week-empty-slot" aria-label={`Add event ${fullDate(day)} at ${timeText(480+half*30)}`} onclick={()=>openNewScheduleEvent(day,480+half*30)}></button>{/each}
                  {#each scheduleBlocks(day) as block}
                    <button
                      class="web-week-event"
                      style:--block-color={blockColor(block.event)}
                      style:top={`${(Math.max(block.start, 480) - 480) / 900 * 100}%`}
                      style:height={`${Math.max(
                        2,
                        (Math.min(block.end, 1380) -
                          Math.max(block.start, 480)) /
                          900 *
                          100
                      )}%`}
                      onclick={()=>openScheduleEditor(block,day)}
                    >
                      <strong>
                        {block.event.title}
                      </strong>

                      <small>
                        {timeText(block.start)}
                      </small>
                    </button>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </section>
    {/if}

  </main>

  <dialog class="schedule-editor" bind:this={scheduleDialog}>
    <form onsubmit={saveScheduleEvent}>
      <h2>Edit activity</h2>
      <label>Name<input maxlength="20" required bind:value={eventTitle}/></label>
      <label>Date<input type="date" min={START} max={END} required bind:value={eventDate}/></label>
      <div class="schedule-time-fields"><label>Start<input type="time" required bind:value={eventStart}/></label><label>End<input type="time" required bind:value={eventEnd}/></label></div>
      <label class="schedule-check"><input type="checkbox" bind:checked={eventRepeats}/> Repeat every week</label>
      {#if eventRepeats}<label>Repeat through<input type="date" min={eventDate} max={END} required bind:value={eventUntil}/></label>{/if}
      <fieldset><legend>Color</legend><div class="schedule-colors">{#each Object.entries(COLORS) as [name,hex]}<label style:--swatch={hex}><input type="radio" name="schedule-color" value={name} bind:group={eventColor}/><i></i>{name}</label>{/each}</div></fieldset>
      <div class="schedule-dialog-actions"><button type="button" onclick={()=>scheduleDialog.close()}>Cancel</button><button type="submit">Save event</button></div>
      {#if editingBlock}<div class="schedule-dialog-actions delete-actions"><button type="button" onclick={()=>deleteScheduleEvent(false)}>Delete{rows('timed_event_series').find(r=>r.id===(editingBlock?.event as any)?.series_id)?.repeat_until?' this occurrence':' event'}</button>{#if rows('timed_event_series').find(r=>r.id===(editingBlock?.event as any)?.series_id)?.repeat_until}<button type="button" onclick={()=>deleteScheduleEvent(true)}>Delete entire series</button>{/if}</div>{/if}
    </form>
  </dialog>

  <footer>
    Il faut cultiver notre jardin
    <span>
      KRMF
    </span>
  </footer>
</div>
