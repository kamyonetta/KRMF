<script lang="ts">
  import { dockNavigation } from '../../lib/dockNavigation';
  import TodayButton from '../../lib/components/TodayButton.svelte';
  import { onMount } from 'svelte';
  import { isTauri } from '@tauri-apps/api/core';
  import { getDatabase } from '../../lib/database';
  import { START, END, localKey, fullDate } from '../calendar/model';
  import { weekDates, weekStart, addDays, supported } from '../calendar/weekly-model';
  import { HABIT_DAYS, scheduled, habitScore } from './model';
  import type { Habit, Checkin } from './model';
  import '../calendar/calendar.css';
  import './habits.css';
  const openedOn = localKey(new Date());
  let today = $state(openedOn);
  let anchor = $state(openedOn < START ? START : openedOn > END ? END : openedOn);
  let view = $state<'week' | 'scores'>('week');
  let habits = $state<Habit[]>([]);
  let checkins = $state<Checkin[]>([]);
  let ready = $state(false), busy = $state(false), loading = $state(true);
  let error = $state(''), formError = $state(''), title = $state('');
  let mask = $state(0);
  let addDialog: HTMLDialogElement, deleteDialog: HTMLDialogElement;
  const days = $derived(weekDates(anchor));
  const range = $derived(`${new Date(days[0]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(days[6]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`);
  const checked = (id: string, date: string) => checkins.some(c=>c.habit_id===id && c.checkin_date===date);
  async function refresh() {
    loading = true; error = '';
    try {
      const db = await getDatabase();
      const [h,c] = await Promise.all([db.select<Habit[]>('SELECT id,title,weekday_mask,starts_on FROM habits ORDER BY created_at,id'),db.select<Checkin[]>('SELECT habit_id,checkin_date FROM habit_checkins')]);
      habits = h; checkins = c; ready = true;
    } catch (e) { error = `Could not open your habits: ${String(e)}`; }
    finally { loading = false; }
  }
  onMount(() => {
    if (isTauri()) void refresh(); else { loading = false; error = 'Open the desktop app to save and track your habits.'; }
    const timer = window.setInterval(()=>today=localKey(new Date()),60000);
    return ()=>window.clearInterval(timer);
  });
  function move(direction: number) { const next = addDays(weekStart(anchor),direction*7); if(next > END || addDays(next,6)<START) return; anchor = next < START ? START : next; }
  function openAdd() { title = ''; mask = 0; formError = ''; addDialog.showModal(); }
  async function add(event: SubmitEvent) {
    event.preventDefault(); if(busy || !ready || !title.trim() || !mask) return;
    busy = true; formError = '';
    const habit: Habit = {id:crypto.randomUUID(),title:title.trim(),weekday_mask:mask,starts_on:today < START ? START : today > END ? END : today};
    try {
      const db = await getDatabase();
      await db.execute('INSERT INTO habits(id,title,weekday_mask,starts_on) VALUES($1,$2,$3,$4)',[habit.id,habit.title,habit.weekday_mask,habit.starts_on]);
      habits = [...habits,habit]; anchor = habit.starts_on; addDialog.close();
    } catch(e) { formError = `Could not save the habit: ${String(e)}`; }
    finally { busy = false; }
  }
  async function toggle(habit: Habit, date: string) {
    if(busy || !ready || !scheduled(habit,date)) return;
    busy = true; error = '';
    try {
      const db = await getDatabase();
      if(checked(habit.id,date)) { await db.execute('DELETE FROM habit_checkins WHERE habit_id=$1 AND checkin_date=$2',[habit.id,date]); checkins=checkins.filter(c=>!(c.habit_id===habit.id && c.checkin_date===date)); }
      else { await db.execute('INSERT INTO habit_checkins(habit_id,checkin_date) VALUES($1,$2)',[habit.id,date]);checkins=[...checkins,{habit_id:habit.id,checkin_date:date}]; }
    } catch(e) { error = `Could not update the check-in: ${String(e)}`; }
    finally { busy = false; }
  }
  async function remove(habit: Habit) {
    if(busy) return; busy = true; formError = '';
    try { const db=await getDatabase();await db.execute('DELETE FROM habits WHERE id=$1',[habit.id]);habits=habits.filter(h=>h.id!==habit.id);checkins=checkins.filter(c=>c.habit_id!==habit.id); }
    catch(e) { formError=`Could not delete the habit: ${String(e)}`; }
    finally { busy=false; }
  }
</script>
<section class="calendar-shell habit-tracker">
  <header class="calendar-toolbar"><h1>Habit Tracker</h1><div class="calendar-tabs"><button class:chosen={view==='week'} onclick={()=>view='week'}>Weekly</button><button class:chosen={view==='scores'} onclick={()=>view='scores'}>★ Scores</button></div></header>
  <div class="habit-actions"><button disabled={!ready || busy} onclick={openAdd}>+ Add habit</button><button disabled={!ready || busy || !habits.length} onclick={()=>{formError='';deleteDialog.showModal();}}>Delete a habit</button></div>
  {#if loading}<p class="calendar-notice" role="status">Opening your habits…</p>{/if}
  {#if error}<div class="calendar-notice" role="alert">{error}{#if isTauri()} <button disabled={busy} onclick={refresh}>Retry</button>{/if}</div>{/if}
  {#if view==='week'}
    <div class="habit-week">
      {#each days as date}<section class="habit-day" class:today={date===today} class:outside={!supported(date)}>
        <h2>{new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}<span>{new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></h2>
        {#if supported(date)}
          {#each habits.filter(h=>scheduled(h,date)) as habit}<button class="habit-check-row" role="checkbox" aria-checked={checked(habit.id,date)} aria-label={`${habit.title}, ${fullDate(date)}`} disabled={!ready || busy} onclick={()=>toggle(habit,date)}><svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="white" d="M2 0h12v2h2v12h-2v2H2v-2H0V2h2z"/><path fill="#16161b" d="M3 3h10v10H3z"/>{#if checked(habit.id,date)}<path fill="#ffe27a" d="M3 7h2v2h2V7h2V5h2V3h2v4h-2v2H9v2H7v2H5v-2H3z"/>{/if}</svg><span>{habit.title}</span></button>{:else}<p class="habit-rest">A little room to breathe.</p>{/each}
        {/if}
      </section>{/each}
    </div>
    {#if ready && !habits.length}<p class="habit-hint">Add a habit and choose its weekdays to get started.</p>{/if}
    <div class="navigation-source"><footer use:dockNavigation class="calendar-bottom"><div class="calendar-navigation"><button class="triangle-button" aria-label="Previous week" disabled={days[0]<=START} onclick={()=>move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M19 2v20L3 12z"/><path fill="white" d="M17 0v20L1 10z"/></svg></button><h2>{range}</h2><button class="triangle-button" aria-label="Next week" disabled={days[6]>=END} onclick={()=>move(1)}><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#999" d="M3 2v20l16-10z"/><path fill="white" d="M1 0v20l16-10z"/></svg></button><TodayButton label="Return to this week" disabled={busy} onclick={() => { const now = localKey(new Date()); anchor = now < START ? START : now > END ? END : now;  }}/></div></footer></div>
  {:else}
    <div class="habit-score-intro"><h2>Your little hall of fame</h2><p>Streaks count scheduled days. Days off don’t break them.</p></div>
    <div class="habit-scores">{#each habits as habit}{@const score=habitScore(habit,checkins,today)}<article class="habit-score-card"><div class="habit-score-heading"><h3>{habit.title}</h3>{#if score.active}<svg class="pixel-trophy" viewBox="0 0 32 32" role="img" aria-label="Streak currently active" shape-rendering="crispEdges"><path fill="#2d1736" d="M7 3h18v3h5v10h-5v4h-6v6h6v4H7v-4h6v-6H7v-4H2V6h5z"/><path fill="#ffbd45" d="M9 5h14v11h-3v3h-8v-3H9zM4 8h3v6H4zM25 8h3v6h-3zM15 19h2v8h-2zM9 27h14v2H9z"/><path fill="#fff1a1" d="M10 6h3v8h-3zM14 6h7v2h-7z"/></svg>{/if}</div><span class="score-number">{score.longest}</span><span class="score-caption">longest streak</span><p>{score.active ? `${score.current} in a row · still growing!` : 'A fresh start is always welcome.'}</p><small>{score.total} check-ins collected</small></article>{:else}<p class="habit-hint">Your first habit starts the story.</p>{/each}</div>
  {/if}
</section>
<dialog class="calendar-dialog" bind:this={addDialog} oncancel={e=>{if(busy)e.preventDefault();}}><form onsubmit={add}><h2>A little every week</h2><label for="new-habit">Habit name</label><input id="new-habit" type="text" maxlength="80" required bind:value={title} disabled={busy}/><fieldset disabled={busy}><legend>Which days?</legend><div class="habit-weekday-picker">{#each HABIT_DAYS as day}<button type="button" aria-pressed={!!(mask & day.bit)} class:chosen={!!(mask & day.bit)} onclick={()=>mask^=day.bit}>{day.name}</button>{/each}</div></fieldset><p>Starts today. Check off each scheduled day as you go.</p>{#if formError}<p role="alert" class="calendar-form-error">{formError}</p>{/if}<div class="dialog-actions"><button type="button" disabled={busy} onclick={()=>addDialog.close()}>Cancel</button><button type="submit" disabled={busy || !title.trim() || !mask}>{busy?'Saving…':'Add habit'}</button></div></form></dialog>
<dialog class="calendar-dialog" bind:this={deleteDialog} oncancel={e=>{if(busy)e.preventDefault();}}><h2>Delete a habit</h2><p>Deleting removes the habit and all its check-ins and scores.</p><ul class="habit-delete-list">{#each habits as habit}<li><span>{habit.title}</span><button disabled={busy} onclick={()=>remove(habit)} aria-label={`Delete ${habit.title}`}>Delete</button></li>{:else}<li>No habits to delete.</li>{/each}</ul>{#if formError}<p role="alert" class="calendar-form-error">{formError}</p>{/if}<div class="dialog-actions"><button disabled={busy} onclick={()=>deleteDialog.close()}>Back</button></div></dialog>
