export const START = '2026-09-01';
export const END = '2027-12-31';
export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const COLORS = { red: '#ff686e', purple: '#c38aff', green: '#75dc94', blue: '#70b5ff', yellow: '#ffe276' } as const;
export type EventColor = keyof typeof COLORS;
export type ImportantEvent = { id: string; event_date: string; title: string; color: EventColor };
export type CalendarEvent = { id: string; title: string; starts_at: string; ends_at: string; all_day: number; timezone: string };
export const dateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const localKey = (date: Date) => dateKey(date.getFullYear(), date.getMonth(), date.getDate());
export function validDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < START || key > END) return false;
  const [y, m, d] = key.split('-').map(Number);
  return localKey(new Date(y, m - 1, d, 12)) === key;
}
export function monthCells(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1, 12).getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0, 12).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    return day < 1 || day > length ? null : dateKey(year, month, day);
  });
}
export function fullDate(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
export function eventsOnDay(events: CalendarEvent[], key: string): CalendarEvent[] {
  const start = new Date(`${key}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return events.filter(event => event.all_day
    ? event.starts_at.slice(0, 10) <= key && event.ends_at.slice(0, 10) > key
    : new Date(event.starts_at) < end && new Date(event.ends_at) > start);
}
export function ringStyle(events: ImportantEvent[]): string {
  const colors = [...new Set(events.map(e => COLORS[e.color]))];
  if (!colors.length) return 'transparent';
  return `conic-gradient(${colors.map((color, i) => `${color} ${i * 100 / colors.length}% ${(i + 1) * 100 / colors.length}%`).join(',')})`;
}

export type CalendarLocation = { view: "month" | "week" | "year"; month: number; year: number; weekAnchor: string };
