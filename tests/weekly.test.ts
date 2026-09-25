import test from 'node:test';
import assert from 'node:assert/strict';
import { weekDates, expandSeries, validateSeries, parseTime, layoutDay, slotEvents } from '../src/modules/calendar/weekly-model.ts';
import type { TimedSeries } from '../src/modules/calendar/weekly-model.ts';
const base: TimedSeries = { id: 'series', title: 'Class', first_date: '2026-09-15', start_minute: 600, end_minute: 680, repeat_until: '2026-09-29', color: 'blue' };
test('weekly recurrence is inclusive and occurs on the same weekday', () => {
 const rows = expandSeries([base]);
 assert.equal(rows.length,3);
 assert.deepEqual(rows.map(e=>e.id), ['series:2026-09-15','series:2026-09-22','series:2026-09-29']);
 assert.equal(expandSeries([{...base,repeat_until:'2026-09-28'}]).length,2);
 assert.equal(expandSeries([{...base,repeat_until:null}]).length,1);
});
test('week boundaries include disabled dates outside the supported range', () => {
 assert.equal(weekDates('2026-09-01')[0],'2026-08-31');
 assert.equal(weekDates('2027-12-31')[6],'2028-01-02');
});
test('invalid windows and recurrence limits are rejected', () => {
 assert.equal(parseTime('10:20'),620); assert.ok(Number.isNaN(parseTime('25:00')));
 for (const edit of [{end_minute:600}, {start_minute:-1}, {repeat_until:'2026-09-01'}, {repeat_until:'2028-01-01'}, {title:''}]) assert.equal(validateSeries({...base,...edit}),false);
});
test('weekly events fill every overlapping day slot without overwriting notes', () => {
 const events=expandSeries([{...base,repeat_until:null}]);
 for(const slot of [4,5,6]) assert.equal(slotEvents(events,base.first_date,slot).length,1);
 for(const slot of [3,7]) assert.equal(slotEvents(events,base.first_date,slot).length,0);
 assert.equal(slotEvents(events,'2026-09-16',4).length,0);
});
test('overlapping events use separate lanes; touching intervals share one', () => {
 const events=expandSeries([{...base,repeat_until:null},{...base,id:'other',start_minute:630,end_minute:700,repeat_until:null}]);
 const rows=layoutDay(events,base.first_date); assert.equal(rows[0].lanes,2);assert.notEqual(rows[0].lane,rows[1].lane);
 const touching=expandSeries([{...base,repeat_until:null},{...base,id:'next',start_minute:680,end_minute:720,repeat_until:null}]);
 assert.ok(layoutDay(touching,base.first_date).every(e=>e.lanes===1));
});
test('weekly wall-clock times remain fixed across DST', () => {
 const original=process.env.TZ; process.env.TZ='America/Toronto';
 try {
 const rows=expandSeries([{...base,first_date:'2026-10-27',repeat_until:'2026-11-10'}]);
 assert.equal(rows.length,3);assert.ok(rows.every(e=>new Date(e.starts_at).getHours()===10));
 assert.notEqual(rows[0].starts_at.slice(11,16),rows[1].starts_at.slice(11,16));
 } finally { if(original) process.env.TZ=original; else delete process.env.TZ; }
});

test('consecutive identical daily entries become a single weekly block', async () => {
 const { plannerBlocks } = await import('../src/modules/calendar/weekly-model.ts');
 const row = (position: number, text: string, plan_date = '2026-09-17') => ({ position, text, plan_date, section: 'slot' });
 const blocks = plannerBlocks([row(6,'Study'),row(4,'Study'),row(5,'Study'),row(7,'Break'),row(9,'Study'),row(10,''),row(11,'Study'),row(12,'Study','2026-09-18')], '2026-09-17');
 assert.equal(blocks.length,4);
 assert.equal(blocks[0].title,'Study');
 assert.equal(new Date(blocks[0].starts_at).getHours(),10);
 assert.equal(new Date(blocks[0].ends_at).getHours(),11);
 assert.equal(new Date(blocks[0].ends_at).getMinutes(),30);
 assert.equal((new Date(blocks[0].ends_at).getTime()-new Date(blocks[0].starts_at).getTime())/60000,90);
});
test('merged planner blocks preserve a midnight end', async () => {
 const { plannerBlocks } = await import('../src/modules/calendar/weekly-model.ts');
 const blocks = plannerBlocks([30,31].map(position=>({position,text:'Read',plan_date:'2026-09-17',section:'slot'})), '2026-09-17');
 assert.equal(blocks.length,1);assert.equal(new Date(blocks[0].ends_at).getDate(),18);assert.equal(new Date(blocks[0].ends_at).getHours(),0);
});
test('deleting one recurrence hides it in weekly and daily schedules only on that date', () => {
 const rows = expandSeries([{...base, excluded_dates: '["2026-09-22"]'}]);
 assert.deepEqual(rows.map(e=>e.id), ['series:2026-09-15','series:2026-09-29']);
 assert.equal(slotEvents(rows,'2026-09-22',4).length,0);
 assert.equal(slotEvents(rows,'2026-09-29',4).length,1);
});
