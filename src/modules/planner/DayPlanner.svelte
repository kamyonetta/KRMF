<script lang="ts">
  import DeleteTodoButton from '../../lib/components/DeleteTodoButton.svelte';
  import { autosize } from '../../lib/autosize';
  import { onMount, tick } from 'svelte';
  import { dailyActivityBlocks, type DailyBlock } from './daily-blocks';
  import type { CalendarEvent } from '../calendar/model';
  import { slotEvents } from '../calendar/weekly-model';
  import { isTauri } from '@tauri-apps/api/core';
  import { blankLines, loadLines, saveLine, deleteTodo, slotTime } from '../calendar/day-planner';
  import type { PlannerLine, Section } from '../calendar/day-planner';
  let { date, onsaved, events = [] }: { date: string; events?: CalendarEvent[]; onsaved: (line: PlannerLine) => void } = $props();
  let slots = $state<PlannerLine[]>([]);
  let todos = $state<PlannerLine[]>([]);
  let notes = $state<PlannerLine[]>([]);
  let ready = $state(false);
  let deleting = $state(false);
  let pending = $state(0);
  let error = $state('');
  let dirty = $state<Record<string, PlannerLine>>({});
  const hours = Array.from({length: 15}, (_, i) => i + 8);
  let focusedSlot = $state<number | null>(null);
  let sheet: HTMLDivElement;
  const merged = $derived(dailyActivityBlocks(slots,events,date));
  const visibleBlocks = $derived(merged.filter(b => focusedSlot === null || focusedSlot < b.first || focusedSlot > b.last));
  const covered = (position: number) => visibleBlocks.some(b => position >= b.first && position <= b.last);
  async function editBlock(block: DailyBlock) {
    focusedSlot = block.first;
    await tick();
    sheet.querySelector<HTMLInputElement>(`input[data-position="${block.first}"]`)?.focus();
  }
  function leaveSlot(event: FocusEvent) {
    const next = event.relatedTarget;
    focusedSlot = next instanceof HTMLInputElement && next.dataset.position !== undefined ? Number(next.dataset.position) : null;
  }
  const key = (line: PlannerLine) => `${line.section}:${line.position}`;
  const same = (a: PlannerLine | undefined, b: PlannerLine) => a?.text === b.text && a?.checked === b.checked;
  async function load() {
    error = '';
    try {
      const saved = await loadLines(date);
      const section = (name: Section) => blankLines(date, name).map(line => saved.find(s => s.section === name && s.position === line.position) ?? line);
      slots = section('slot'); todos = saved.filter(line => line.section === 'todo').sort((a,b) => a.position-b.position); notes = section('note'); ready = true;
    } catch (e) { error = `Could not open this day. ${String(e)}`; }
  }
  onMount(() => {
    slots = blankLines(date, 'slot'); todos = []; notes = blankLines(date, 'note');
    if (isTauri()) void load();
    else error = 'Open the desktop app to edit and save your day.';
  });
  async function persist(line: PlannerLine) {
    const snapshot = { ...line };
    dirty[key(line)] = snapshot; pending++;
    try {
      await saveLine(snapshot);
      if (same(dirty[key(line)], snapshot)) delete dirty[key(line)];
      onsaved(snapshot);
      if (!Object.keys(dirty).length) error = '';
    } catch { error = 'Some changes could not be saved. Keep this day open and retry.'; }
    finally { pending--; }
  }
  function type(line: PlannerLine, event: Event) {
    line.text = (event.currentTarget as HTMLInputElement).value;
    void persist(line);
  }
  function addTodo() {
    const line: PlannerLine = {plan_date:date,section:'todo',position:Math.max(Date.now(),...todos.map(t => t.position + 1)),text:'',checked:0};
    todos = [...todos,line]; void persist(line);
  }
  async function removeTodo(line: PlannerLine) {
    if (pending || deleting || Object.keys(dirty).length) return;
    deleting = true;
    try { await deleteTodo(date,line.position); todos = todos.filter(t => t.position !== line.position); error = ''; }
    catch { error = 'Could not delete this to-do. Please click its × to try again.'; }
    finally { deleting = false; }
  }
  function toggle(line: PlannerLine) { line.checked = line.checked ? 0 : 1; void persist(line); }
  function enter(event: KeyboardEvent) { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }
  function retry() { if (!ready) void load(); else for (const line of Object.values(dirty)) void persist(line); }
</script>

<div class="planner-save-status" role="status">{pending ? 'Saving…' : ready && !Object.keys(dirty).length ? 'Saved on this Mac' : ''}</div>
{#if error}<div class="planner-save-error" role="alert">{error} {#if isTauri()}<button disabled={pending > 0} onclick={retry}>Retry</button>{/if}</div>{/if}
<div class="daily-planner" aria-label="Daily planner">
  <section class="hourly-sheet" aria-label="Half-hour schedule">
    <h3>Hourly planner</h3>
    <div class="daily-time-grid" bind:this={sheet}>
      {#each hours as hour}
        <div class="hour-label" style:grid-row={`${(hour-8)*2+1} / span 2`}>{hour % 12 || 12}<span>{hour < 12 ? 'AM' : 'PM'}</span></div>
      {/each}
      {#each slots.filter(s => s.position >= 0 && s.position < 30) as line}
        {@const timedNames = [...new Set(slotEvents(events,date,line.position).map(event => event.title))].join(' / ')}
        <span class="daily-minute" style:grid-row={line.position+1}>{line.position % 2 ? '30' : '00'}</span>
        <input class="daily-slot-input" class:covered={covered(line.position)} style:grid-row={line.position+1} data-position={line.position} aria-label={`${slotTime(line.position)} plan`} maxlength="20" value={line.text} placeholder={timedNames} title={[line.text,timedNames].filter(Boolean).join(' / ')} oninput={(e) => type(line,e)} onfocus={() => focusedSlot = line.position} onblur={leaveSlot} onkeydown={enter} disabled={!ready || deleting} tabindex={covered(line.position) ? -1 : 0} autocomplete="off" spellcheck="false"/>
      {/each}
      {#each visibleBlocks as block (`${block.first}:${block.last}:${block.title}`)}
        <button class="daily-merged-block" class:single={block.first === block.last} style:grid-row={`${block.first+1} / span ${block.last-block.first+1}`} onclick={() => editBlock(block)} disabled={!ready || deleting} aria-label={`Edit ${block.title}, ${slotTime(block.first)} to ${slotTime(block.last+1)}`} title="Click to edit individual time slots">
          <strong>{block.title}</strong><span>{slotTime(block.first)}–{slotTime(block.last+1)}</span>
        </button>
      {/each}
    </div>
  </section>
  <div class="daily-right">
    <section class="daily-todos" aria-label="Daily to-do list">
      <h3>To do list</h3>
      {#each todos as line, index}
        <div class="daily-todo-line">
          <button class="pixel-checkbox" role="checkbox" aria-checked={Boolean(line.checked)} aria-label={`To-do ${index + 1}${line.text ? `: ${line.text}` : ''}`} disabled={!ready || deleting} onclick={() => toggle(line)}>
            <svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="white" d="M2 0h12v2h2v12h-2v2H2v-2H0V2h2z"/><path fill="#151519" d="M3 3h10v10H3z"/>{#if line.checked}<path fill="white" d="M3 7h2v2h2V7h2V5h2V3h2v4h-2v2H9v2H7v2H5v-2H3z"/>{/if}</svg>
          </button>
          <input aria-label={`To-do ${index + 1} name`} maxlength="20" value={line.text} oninput={(e) => type(line, e)} onkeydown={enter} disabled={!ready || deleting} autocomplete="off" spellcheck="false"/>
          <DeleteTodoButton label={`Delete ${line.text || 'unnamed to-do'}`} disabled={!ready || deleting || pending > 0 || Object.keys(dirty).length > 0} onclick={() => removeTodo(line)}/>
        </div>
      {/each}
      <button class="planner-add-task" disabled={!ready || deleting} onclick={addTodo}>+ Add to-do</button>
    </section>
    <section class="daily-notes" aria-label="Daily notes">
      <h3>Notes</h3>
      <div class="note-lines">{#each notes as line}<textarea use:autosize={line.text} aria-label="Daily notes" value={line.text} oninput={(e) => type(line, e)} disabled={!ready || deleting} spellcheck="false" placeholder=""></textarea>{/each}</div>
    </section>
  </div>
</div>
