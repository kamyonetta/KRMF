import type { CalendarEvent } from '../calendar/model.ts';
import { dayWindow, slotEvents } from '../calendar/weekly-model.ts';
export type DailyBlock = { first: number; last: number; title: string };
/** Presentation only: keep the original editable half-hour records intact. */
export function dailyBlocks(lines: {position:number;text:string}[], events: CalendarEvent[], date: string): DailyBlock[] {
  const groups: DailyBlock[] = [];
  for (const line of [...lines].filter(l => l.position >= 0 && l.position < 30).sort((a,b) => a.position-b.position)) {
    let title = line.text.trim();
    if (!title) {
      const timed = slotEvents(events,date,line.position);
      if (timed.length === 1) {
        const range = dayWindow(timed[0],date), start = (line.position + 16) * 30;
        if (range.start <= start && range.end >= start + 30) title = timed[0].title.trim();
      }
    }
    if (!title) continue;
    const previous = groups.at(-1);
    if (previous && previous.last + 1 === line.position && previous.title === title) previous.last = line.position;
    else groups.push({first:line.position,last:line.position,title});
  }
  return groups.filter(g => g.last > g.first);
}

/** Give every occupied row a block, including partial and overlapping event labels. */
export function dailyActivityBlocks(lines: {position:number;text:string}[], events: CalendarEvent[], date: string): DailyBlock[] {
  const merged = dailyBlocks(lines,events,date);
  const singles = lines.filter(line => line.position >= 0 && line.position < 30 && !merged.some(b => line.position >= b.first && line.position <= b.last)).flatMap(line => {
    const title = line.text.trim() || [...new Set(slotEvents(events,date,line.position).map(e => e.title))].join(' / ');
    return title ? [{first:line.position,last:line.position,title}] : [];
  });
  return [...merged,...singles].sort((a,b) => a.first-b.first);
}
