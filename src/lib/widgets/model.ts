import { START, END, eventsOnDay } from '../../modules/calendar/model.ts';
import type { ImportantEvent, CalendarEvent } from '../../modules/calendar/model.ts';
import { addDays, expandSeries, plannerBlocks, dayWindow } from '../../modules/calendar/weekly-model.ts';
import type { TimedSeries } from '../../modules/calendar/weekly-model.ts';
import type { PlannerLine } from '../../modules/calendar/day-planner.ts';
import type { WeeklyTask } from '../../modules/planner/model.ts';
export type WidgetTask = { id: string; title: string; checked: boolean; date: string };
export type WidgetDay = { todos: WidgetTask[]; important: { id: string; title: string; color: string }[]; schedule: { id: string; title: string; start: number; end: number }[] };
export function widgetSnapshot(lines: PlannerLine[], important: ImportantEvent[], events: CalendarEvent[], series: TimedSeries[], weekly: WeeklyTask[], theme: string) {
  const timed = [...events, ...expandSeries(series)];
  const days: Record<string, WidgetDay> = {};
  for (let key = START; key <= END; key = addDays(key, 1)) {
    const dayEvents = eventsOnDay(timed, key);
    const schedule = [...dayEvents.filter(e => !e.all_day), ...plannerBlocks(lines, key)]
      .map(e => ({ id: e.id, title: e.title, ...dayWindow(e, key) }))
      .sort((a,b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
    const todos = lines.filter(l => l.plan_date === key && l.section === 'todo' && (l.text.trim() || l.checked))
      .sort((a,b) => a.position-b.position).map(l => ({ id: `${key}:${l.position}`, title: l.text, checked: !!l.checked, date: key }));
    const highlights = [...important.filter(e => e.event_date === key).map(e => ({id:e.id,title:e.title,color:e.color})),
      ...dayEvents.filter(e => e.all_day).map(e => ({id:e.id,title:e.title,color:'blue'}))];
    if (todos.length || schedule.length || highlights.length) days[key] = {todos,important:highlights,schedule};
  }
  const weeks: Record<string, WidgetTask[]> = {};
  for (const task of weekly) {
    if (!task.title.trim() && !task.checked) continue;
    (weeks[task.week_start] ??= []).push({id:task.id,title:task.title,checked:!!task.checked,date:''});
  }
  return {version:1,theme,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,days,weeks};
}
