import test from 'node:test';
import assert from 'node:assert/strict';
import { widgetSnapshot } from '../src/lib/widgets/model.ts';
import type { PlannerLine } from '../src/modules/calendar/day-planner.ts';
const day = '2026-09-21';
test('widget snapshot includes daily and independent weekly tasks without changing originals', () => {
 const lines: PlannerLine[] = [{plan_date:day,section:'todo',position:1,text:'Read',checked:0},{plan_date:day,section:'todo',position:2,text:'',checked:0}];
 const before = JSON.stringify(lines);
 const value = widgetSnapshot(lines,[{id:'e',event_date:day,title:'Exam',color:'red'}],[],[],[{id:'w',week_start:day,title:'Weekly task',checked:1}],'light');
 assert.equal(value.days[day].todos.length,1);
 assert.equal(value.days[day].important[0].title,'Exam');
 assert.equal(value.weeks[day][0].checked,true);
 assert.equal(value.theme,'light');
 assert.equal(JSON.stringify(lines),before);
});
test('widget schedule merges manual slots and honors recurring event exclusions', () => {
 const lines: PlannerLine[] = [0,1].map(position=>({plan_date:day,section:'slot',position,text:'Read',checked:0}));
 const value = widgetSnapshot(lines,[],[],[{id:'s',title:'Class',first_date:day,start_minute:600,end_minute:660,repeat_until:'2026-10-05',color:'blue',excluded_dates:'["2026-09-28"]'}],[],'dark');
 assert.deepEqual(value.days[day].schedule.map(({title,start,end})=>({title,start,end})),[{title:'Read',start:480,end:540},{title:'Class',start:600,end:660}]);
 assert.equal(value.days['2026-09-28'],undefined);
 assert.equal(value.days['2026-10-05'].schedule[0].title,'Class');
});
test('widget all-day events respect exclusive end dates', () => {
 const value = widgetSnapshot([],[],[{id:'a',title:'Holiday',starts_at:day,ends_at:'2026-09-23',all_day:1,timezone:''}],[],[],'dark');
 assert.equal(value.days[day].important.length,1);
 assert.equal(value.days['2026-09-22'].important.length,1);
 assert.equal(value.days['2026-09-23'],undefined);
});
