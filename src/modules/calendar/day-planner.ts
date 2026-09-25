import { getDatabase } from '../../lib/database';
export type Section = 'slot' | 'todo' | 'note';
export type PlannerLine = { plan_date: string; section: Section; position: number; text: string; checked: number };
export const COUNTS = { slot: 48, todo: 14, note: 1 } as const;
export function blankLines(date: string, section: Section): PlannerLine[] {
  return Array.from({ length: COUNTS[section] }, (_, index) => ({ plan_date: date, section, position: section === 'slot' ? index - 16 : index, text: '', checked: 0 }));
}
export function slotTime(position: number): string {
  const hour = 8 + Math.floor(position / 2);
  return `${hour % 12 || 12}:${position % 2 ? '30' : '00'} ${hour < 12 ? 'AM' : 'PM'}`;
}
// A shared queue preserves edit order, including when leaving and reopening a day.
let writes: Promise<void> = Promise.resolve();
export function saveLine(line: PlannerLine): Promise<void> {
  const snapshot = { ...line };
  const operation = writes.then(async () => {
    const db = await getDatabase();
    if (snapshot.section === 'note') {
      await db.execute('INSERT INTO daily_notes(plan_date,body) VALUES($1,$2) ON CONFLICT(plan_date) DO UPDATE SET body=excluded.body', [snapshot.plan_date,snapshot.text]);
      return;
    }
    await db.execute(`INSERT INTO day_planner_lines (plan_date, section, position, text, checked)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(plan_date, section, position) DO UPDATE SET text = excluded.text, checked = excluded.checked`,
    [snapshot.plan_date, snapshot.section, snapshot.position, snapshot.text, snapshot.checked]);
  });
  writes = operation.catch(() => {});
  return operation;
}
export async function loadLines(date: string): Promise<PlannerLine[]> {
  await writes;
  const db = await getDatabase();
  const lines = await db.select<PlannerLine[]>("SELECT * FROM day_planner_lines WHERE plan_date = $1 AND section != 'note' ORDER BY section, position", [date]);
  const notes = await db.select<{body:string}[]>('SELECT body FROM daily_notes WHERE plan_date=$1',[date]);
  return [...lines, {plan_date:date,section:'note',position:0,text:notes[0]?.body ?? '',checked:0}];
}

export function deleteTodo(date: string, position: number): Promise<void> {
  const operation = writes.then(async () => {
    const db = await getDatabase();
    await db.execute("DELETE FROM day_planner_lines WHERE plan_date=$1 AND section='todo' AND position=$2",[date,position]);
  });
  writes = operation.catch(() => {});
  return operation;
}
