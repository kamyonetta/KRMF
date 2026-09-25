export type CalendarTodo = { plan_date: string; position: number; text: string; checked: number };
export type DayBox = { plan_date: string; body: string; imported_positions: string };
export type WeeklyTask = { id: string; week_start: string; title: string; checked: number };
/** Each calendar row is copied once. A deliberately cleared copy stays cleared. */
export function mergeDayBox(date: string, saved: DayBox | undefined, todos: CalendarTodo[]): DayBox {
  const seen = new Set<number>(JSON.parse(saved?.imported_positions ?? '[]'));
  const fresh = todos.filter(t => t.plan_date === date && t.text.trim() && !seen.has(t.position)).sort((a,b) => a.position-b.position);
  for (const todo of fresh) seen.add(todo.position);
  return { plan_date: date, body: [saved?.body ?? '', ...fresh.map(t => t.text)].filter(Boolean).join('\n'), imported_positions: JSON.stringify([...seen].sort((a,b)=>a-b)) };
}
