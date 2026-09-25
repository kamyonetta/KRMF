import test from 'node:test';
import assert from 'node:assert/strict';
import { habitScore, scheduled } from '../src/modules/habits/model.ts';
const habit={id:'h',title:'Read',weekday_mask:2|8|32,starts_on:'2026-09-14'};
const done=(...dates:string[])=>dates.map(checkin_date=>({habit_id:'h',checkin_date}));
test('habits appear only on selected weekdays and after their start',()=>{
 assert.equal(scheduled(habit,'2026-09-14'),true);assert.equal(scheduled(habit,'2026-09-15'),false);assert.equal(scheduled(habit,'2026-09-11'),false);
});
test('days off and an unfinished today preserve the active streak',()=>{
 const checks=done('2026-09-14','2026-09-16');
 assert.deepEqual(habitScore(habit,checks,'2026-09-18'),{longest:2,current:2,total:2,active:true});
 assert.equal(habitScore(habit,checks,'2026-09-17').current,2);
});
test('a missed scheduled day breaks current streak but retains longest',()=>{
 const checks=done('2026-09-14','2026-09-16');
 assert.deepEqual(habitScore(habit,checks,'2026-09-19'),{longest:2,current:0,total:2,active:false});
 assert.deepEqual(habitScore(habit,[...checks,...done('2026-09-21')],'2026-09-21'),{longest:2,current:1,total:3,active:true});
});
test('future and unscheduled check-ins do not inflate scores',()=>{
 assert.deepEqual(habitScore(habit,done('2026-09-15','2026-09-21'),'2026-09-16'),{longest:0,current:0,total:0,active:false});
});
test('unticking recomputes longest and active streak',()=>{
 const all=done('2026-09-14','2026-09-16','2026-09-18');
 assert.equal(habitScore(habit,all,'2026-09-18').longest,3);
 assert.equal(habitScore(habit,all.filter(c=>c.checkin_date!=='2026-09-16'),'2026-09-18').longest,1);
});
