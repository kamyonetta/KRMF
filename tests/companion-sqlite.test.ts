import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { initializeSqlite, captureSqlite, applySqlite } from '../src/companion/sqlite-sync.ts';
import { pending, recordId, type Remote } from '../src/companion/sync.ts';
function database(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('src-tauri/migrations').sort())db.exec(readFileSync(`src-tauri/migrations/${f}`,'utf8'));initializeSqlite(db,'test-user@staging');return db;}
const date='2026-09-21',id=recordId('daily_notes',[date]);
const remote=(body:string,version=1):Remote=>({id,table:'daily_notes',key:[date],data:{plan_date:date,body},version});
test('all existing migrations work; remote note updates SQLite and next capture is clean',()=>{
 const db=database();const state=applySqlite(db,{protocol:1,results:[],records:[remote('From iPhone')]},[]);
 assert.equal(db.prepare('SELECT body FROM daily_notes').get()?.body,'From iPhone');assert.equal(pending(captureSqlite(db)).length,0);assert.equal(state.entries[id].remote.version,1);db.close();
});
test('Mac edits during HTTP request survive remote acknowledgement',()=>{
 const db=database();db.prepare('INSERT INTO daily_notes VALUES(?,?)').run(date,'Mac first');const sent=pending(captureSqlite(db));
 db.prepare('UPDATE daily_notes SET body=?').run('Mac newer');
 const state=applySqlite(db,{protocol:1,results:[{mutation:sent[0].mutation,status:'accepted',record:remote('Mac first')}],records:[remote('Mac first')]},sent);
 assert.equal(db.prepare('SELECT body FROM daily_notes').get()?.body,'Mac newer');assert.equal(pending(state)[0].base,1);db.close();
});
test('remote malformed row rolls back every row and sync metadata together',()=>{
 const db=database(), before=db.prepare('SELECT body FROM _krmf_companion_state').get()?.body;
 const bad:Remote={id:recordId('day_planner_lines',[date,'slot',99]),table:'day_planner_lines',key:[date,'slot',99],version:1,data:{plan_date:date,section:'slot',position:99,text:'bad',checked:0}};
 assert.throws(()=>applySqlite(db,{protocol:1,results:[],records:[remote('good'),bad]},[]));
 assert.equal(db.prepare('SELECT count(*) AS n FROM daily_notes').get()?.n,0);assert.equal(db.prepare('SELECT body FROM _krmf_companion_state').get()?.body,before);db.close();
});
test('local deletion produces durable tombstone and account switching is refused',()=>{
 const db=database();applySqlite(db,{protocol:1,results:[],records:[remote('a')]},[]);db.exec('DELETE FROM daily_notes');
 assert.equal(pending(captureSqlite(db))[0].data,null);assert.throws(()=>initializeSqlite(db,'different-user'));db.close();
});
test('habit deletion retains check-in history and restoration materializes it again',()=>{
 const db=database(), hid=recordId('habits',['h']),cid=recordId('habit_checkins',['h',date]);
 const habit:Remote={id:hid,table:'habits',key:['h'],version:1,data:{id:'h',title:'Read',weekday_mask:127,starts_on:date,created_at:'2026-09-21T00:00:00Z'}};
 const check:Remote={id:cid,table:'habit_checkins',key:['h',date],version:1,data:{habit_id:'h',checkin_date:date}};
 applySqlite(db,{protocol:1,results:[],records:[habit,check]},[]);
 applySqlite(db,{protocol:1,results:[],records:[{...habit,data:null,version:2},check]},[]);
 assert.equal(captureSqlite(db).entries[cid].value?.habit_id,'h');
 applySqlite(db,{protocol:1,results:[],records:[{...habit,version:3},check]},[]);
 assert.equal(db.prepare('SELECT count(*) AS n FROM habit_checkins').get()?.n,1);db.close();
});
