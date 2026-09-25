import { recordId, type RecordValue, type Row } from './sync.ts';
export const keys: Record<string, string[]> = {
  day_planner_lines: ['plan_date','section','position'], daily_notes: ['plan_date'],
  weekly_planner_tasks: ['id'], weekly_planner_days: ['plan_date'], weekly_planner_notes: ['week_start'],
  habits: ['id'], habit_checkins: ['habit_id','checkin_date'],
  important_events: ['id'], calendar_events: ['id'], timed_event_series: ['id'],
};
export function record(table: string, data: Row): RecordValue {
  if (!keys[table]) throw new Error('Unsupported table');
  return { table, key: keys[table].map(k => data[k] as string | number), data };
}
export function rowId(table: string, data: Row) { const r = record(table,data); return recordId(table,r.key); }
