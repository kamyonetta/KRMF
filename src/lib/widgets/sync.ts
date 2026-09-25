import type Database from '@tauri-apps/plugin-sql';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { widgetSnapshot } from './model';
import type { PlannerLine } from '../../modules/calendar/day-planner';
import type { ImportantEvent, CalendarEvent } from '../../modules/calendar/model';
import type { TimedSeries } from '../../modules/calendar/weekly-model';
import type { WeeklyTask } from '../../modules/planner/model';
let database: Database | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let dirty = false;
let lastPublished = '';
export function connectWidgets(db: Database) { database = db; requestWidgetSync(); }
export function requestWidgetSync() {
  if (!isTauri()) return;
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(() => { void publish(); }, 500);
}
async function publish() {
  if (!database || running) return;
  running = true; dirty = false;
  try {
    const [lines, important, events, series, weekly] = await Promise.all([
      database.select<PlannerLine[]>("SELECT * FROM day_planner_lines WHERE section IN ('slot','todo')"),
      database.select<ImportantEvent[]>('SELECT * FROM important_events ORDER BY event_date,title'),
      database.select<CalendarEvent[]>('SELECT * FROM calendar_events'),
      database.select<TimedSeries[]>('SELECT * FROM timed_event_series'),
      database.select<WeeklyTask[]>('SELECT * FROM weekly_planner_tasks ORDER BY created_at,id'),
    ]);
    const payload = JSON.stringify(widgetSnapshot(lines, important, events, series, weekly, localStorage.getItem('krmf-theme') ?? 'dark'));
    if (payload !== lastPublished) {
      await invoke('publish_widgets', {payload});
      lastPublished = payload;
    }
  } catch (error) {
    console.warn('Widget refresh will retry:', error);
    void invoke('report_widget_sync_error', {message: String(error)}).catch(() => {});
    dirty = true;
  } finally {
    running = false;
    if (dirty) { clearTimeout(timer); timer = setTimeout(() => { void publish(); }, 10000); }
  }
}
