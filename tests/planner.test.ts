import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDayBox } from '../src/modules/planner/model.ts';
const date = '2026-09-17';
const source = [{plan_date:date,position:0,text:'Read',checked:0},{plan_date:date,position:1,text:'Study',checked:1}];
test('day boxes import calendar to-do names once without changing originals',()=>{
 const original=structuredClone(source);
 const box=mergeDayBox(date,undefined,source);
 assert.equal(box.body,'Read\nStudy');
 assert.deepEqual(source,original);
 assert.deepEqual(mergeDayBox(date,box,source),box);
});
test('editing or clearing an imported day box never restores deleted letters',()=>{
 const box=mergeDayBox(date,undefined,source);
 assert.equal(mergeDayBox(date,{...box,body:'Re\nMy own plans'},source).body,'Re\nMy own plans');
 assert.equal(mergeDayBox(date,{...box,body:''},source).body,'');
});
test('new calendar tasks append without duplicating prior imports',()=>{
 const box=mergeDayBox(date,undefined,source);
 const newSource=[...source,{plan_date:date,position:2,text:'Walk',checked:0},{plan_date:'2026-09-18',position:3,text:'Other day',checked:0}];
 const result=mergeDayBox(date,{...box,body:'My note'},newSource);
 assert.equal(result.body,'My note\nWalk');
 assert.equal(mergeDayBox(date,result,newSource).body,'My note\nWalk');
});
test('an empty calendar row can be named later and then imported',()=>{
 const blank={plan_date:date,position:4,text:'',checked:1};
 const box=mergeDayBox(date,undefined,[blank]);
 assert.equal(box.imported_positions,'[]');
 assert.equal(mergeDayBox(date,box,[{...blank,text:'New name'}]).body,'New name');
});
