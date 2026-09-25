import { START, END } from '../calendar/model.ts';
import { addDays } from '../calendar/weekly-model.ts';
export type Habit = { id: string; title: string; weekday_mask: number; starts_on: string };
export type Checkin = { habit_id: string; checkin_date: string };
export const HABIT_DAYS = [{name:'Mon',bit:2},{name:'Tue',bit:4},{name:'Wed',bit:8},{name:'Thu',bit:16},{name:'Fri',bit:32},{name:'Sat',bit:64},{name:'Sun',bit:1}];
export function scheduled(habit: Habit, date: string): boolean {
  return date >= START && date <= END && date >= habit.starts_on && !!(habit.weekday_mask & (1 << new Date(`${date}T12:00:00`).getDay()));
}
/** Streaks count consecutive scheduled check-ins; unscheduled days never break them. */
export function habitScore(habit: Habit, checkins: Checkin[], today: string) {
  const done = new Set(checkins.filter(c=>c.habit_id===habit.id).map(c=>c.checkin_date));
  let run = 0, longest = 0, total = 0;
  const end = today < END ? today : END;
  for (let day = habit.starts_on > START ? habit.starts_on : START; day <= end; day = addDays(day,1)) {
    if (!scheduled(habit,day)) continue;
    if (done.has(day)) { run++; total++; longest = Math.max(longest,run); }
    else if (day !== today) run = 0; // Today's check-in remains available until midnight.
  }
  const active = run > 0 && today <= END;
  return { longest, current: active ? run : 0, total, active };
}
