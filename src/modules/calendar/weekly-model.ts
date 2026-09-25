import { START, END, localKey, validDate } from './model.ts';
import type { CalendarEvent, EventColor } from './model.ts';
export type TimedSeries = { id: string; title: string; first_date: string; start_minute: number; end_minute: number; repeat_until: string | null; color: EventColor; excluded_dates?: string };
export type TimedOccurrence = CalendarEvent & { color?: EventColor; series_id?: string };
export function addDays(key: string, amount: number): string {
  const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + amount); return localKey(d);
}
export function weekStart(key: string): string {
  const d = new Date(`${key}T12:00:00`); return addDays(key, -((d.getDay() + 6) % 7));
}
export function weekDates(key: string): string[] { const first = weekStart(key); return Array.from({ length: 7 }, (_, i) => addDays(first, i)); }
export function timeText(minute: number): string { const h = Math.floor(minute / 60) % 24; return `${h % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
export function parseTime(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [h, m] = value.split(':').map(Number); return h * 60 + m;
}
export function validateSeries(item: TimedSeries): boolean {
  return validDate(item.first_date) && !!item.title.trim() && item.title.trim().length <= 20 &&
    Number.isInteger(item.start_minute) && Number.isInteger(item.end_minute) && item.start_minute >= 0 && item.end_minute <= 1440 && item.end_minute > item.start_minute &&
    (!item.repeat_until || (validDate(item.repeat_until) && item.repeat_until >= item.first_date)) && ['red','purple','green','blue','yellow'].includes(item.color);
}
export function expandSeries(series: TimedSeries[]): TimedOccurrence[] {
  return series.flatMap(item => {
    if (!validateSeries(item)) return [];
    const rows: TimedOccurrence[] = [];
    for (let key = item.first_date; key <= (item.repeat_until ?? item.first_date); key = addDays(key, 7)) {
      if ((JSON.parse(item.excluded_dates ?? '[]') as string[]).includes(key)) continue;
      const start = new Date(`${key}T00:00:00`); start.setMinutes(item.start_minute);
      const end = new Date(`${key}T00:00:00`); end.setMinutes(item.end_minute);
      rows.push({ id: `${item.id}:${key}`, series_id: item.id, title: item.title, starts_at: start.toISOString(), ends_at: end.toISOString(), all_day: 0, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, color: item.color });
    }
    return rows;
  });
}
export function dayWindow(event: CalendarEvent, key: string): { start: number; end: number } {
  const a = new Date(event.starts_at), b = new Date(event.ends_at);
  return { start: localKey(a) < key ? 0 : a.getHours() * 60 + a.getMinutes(), end: localKey(b) > key ? 1440 : b.getHours() * 60 + b.getMinutes() };
}
export function slotEvents(events: CalendarEvent[], key: string, position: number): CalendarEvent[] {
  const minute = (position + 16) * 30;
  return events.filter(e => !e.all_day && new Date(e.starts_at) < new Date(`${addDays(key, 1)}T00:00:00`) && new Date(e.ends_at) > new Date(`${key}T00:00:00`) && dayWindow(e,key).start < minute + 30 && dayWindow(e,key).end > minute);
}
export function layoutDay(events: TimedOccurrence[], key: string) {
  const rows = events.map(event => ({ event, ...dayWindow(event, key), lane: 0, lanes: 1 })).sort((a,b) => a.start - b.start || b.end - a.end);
  let cluster: typeof rows = [], ends: number[] = [], clusterEnd = -1;
  function finish() { for (const row of cluster) row.lanes = ends.length; cluster = []; ends = []; }
  for (const row of rows) {
    if (row.start >= clusterEnd) { finish(); clusterEnd = -1; }
    let lane = ends.findIndex(end => end <= row.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = row.end; row.lane = lane; cluster.push(row); clusterEnd = Math.max(clusterEnd, row.end);
  }
  finish(); return rows;
}
export const supported = (key: string) => key >= START && key <= END;

/** Coalesce only adjacent, identically named half-hour planner entries on one day. */
export function plannerBlocks(lines: { plan_date: string; section: string; position: number; text: string }[], key: string): TimedOccurrence[] {
  const slots = lines.filter(line => line.plan_date === key && line.section === 'slot' && line.text.trim()).sort((a,b) => a.position - b.position);
  const groups: { first: number; last: number; title: string }[] = [];
  for (const line of slots) {
    const previous = groups.at(-1);
    const title = line.text.trim();
    if (previous && previous.last + 1 === line.position && previous.title === title) previous.last = line.position;
    else groups.push({ first: line.position, last: line.position, title });
  }
  return groups.map(group => {
    const start = new Date(`${key}T00:00:00`); start.setMinutes((group.first + 16) * 30);
    const end = new Date(`${key}T00:00:00`); end.setMinutes((group.last + 17) * 30);
    return { id: `slot:${key}:${group.first}`, title: group.title, starts_at: start.toISOString(), ends_at: end.toISOString(), all_day: 0, timezone: '' };
  });
}
