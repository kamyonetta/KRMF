import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyBlocks, dailyActivityBlocks } from '../src/modules/planner/daily-blocks.ts';
import { expandSeries } from '../src/modules/calendar/weekly-model.ts';
const date = '2026-09-19';
test('daily matching slots merge across hours without changing source records', () => {
 const lines = [{position:1,text:' Read '},{position:2,text:'Read'},{position:3,text:'Read'},{position:4,text:'Walk'}];
 const before = JSON.stringify(lines);
 assert.deepEqual(dailyBlocks(lines,[],date),[{first:1,last:3,title:'Read'}]);
 assert.equal(JSON.stringify(lines),before);
});
test('gaps, blanks, and different names split daily blocks', () => {
 assert.deepEqual(dailyBlocks([{position:0,text:'Read'},{position:1,text:''},{position:2,text:'Read'},{position:3,text:'read'},{position:5,text:'Read'}],[],date),[]);
});
test('weekly activities use the same daily blocks; overlaps and partial slots stay separate', () => {
 const lines = Array.from({length:4},(_,position)=>({position,text:''}));
 const events = expandSeries([{id:'a',title:'Class',first_date:date,start_minute:480,end_minute:540,repeat_until:null,color:'blue'}]);
 assert.deepEqual(dailyBlocks(lines,events,date),[{first:0,last:1,title:'Class'}]);
 const overlapping = expandSeries([{id:'b',title:'Other',first_date:date,start_minute:510,end_minute:540,repeat_until:null,color:'red'}]);
 assert.deepEqual(dailyBlocks(lines,[...events,...overlapping],date),[]);
 const partial = expandSeries([{id:'c',title:'Class',first_date:date,start_minute:485,end_minute:535,repeat_until:null,color:'blue'}]);
 assert.deepEqual(dailyBlocks(lines,partial,date),[]);
});
test('editing one slot splits a block and the last visible slots can merge', () => {
 assert.deepEqual(dailyBlocks([{position:27,text:'Rest'},{position:28,text:'Rest'},{position:29,text:'Rest'}],[],date),[{first:27,last:29,title:'Rest'}]);
 assert.deepEqual(dailyBlocks([{position:27,text:'Rest'},{position:28,text:'Read'},{position:29,text:'Rest'}],[],date),[]);
});

test('all occupied daily slots become blocks, while empty slots remain editable', () => {
 assert.deepEqual(dailyActivityBlocks([{position:0,text:'Read'},{position:1,text:'Read'},{position:2,text:''},{position:3,text:'Walk'}],[],date),[{first:0,last:1,title:'Read'},{first:3,last:3,title:'Walk'}]);
 const events = expandSeries([{id:'short',title:'Call',first_date:date,start_minute:485,end_minute:495,repeat_until:null,color:'blue'}]);
 assert.deepEqual(dailyActivityBlocks([{position:0,text:''}],events,date),[{first:0,last:0,title:'Call'}]);
});
