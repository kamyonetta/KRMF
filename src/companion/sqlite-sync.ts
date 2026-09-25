/** Opt-in adapter; never imported by the installed Mac app or browser bundle. */
import { emptyState, edit, reconcile, resolve, same, recordId, type State, type Row, type Reply, type Mutation } from './sync.ts';
import { keys, record } from './schema.ts';
export interface Sqlite { exec(sql:string):void; prepare(sql:string):{all(...args:any[]):any[];get(...args:any[]):any;run(...args:any[]):unknown} }
const META='_krmf_companion_state';
function normalize(table:string,row:Row):Row {
  const result={...row};
  // Conversion instructions are one-time Mac commands, not portable event data.
  if(table==='timed_event_series')for(const k of Object.keys(result))if(k.startsWith('source_'))delete result[k];
  return result;
}
export function initializeSqlite(db:Sqlite, identity:string) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${META}(id INTEGER PRIMARY KEY CHECK(id=1),identity TEXT NOT NULL,body TEXT NOT NULL)`);
  const old=db.prepare(`SELECT identity FROM ${META} WHERE id=1`).get();
  if(old && old.identity!==identity)throw new Error('This database is paired with a different notebook. Refusing to merge accounts.');
  if(!old)db.prepare(`INSERT INTO ${META} VALUES(1,?,?)`).run(identity,JSON.stringify(emptyState()));
}
function load(db:Sqlite):State{return JSON.parse(db.prepare(`SELECT body FROM ${META} WHERE id=1`).get().body);}
function store(db:Sqlite,state:State){db.prepare(`UPDATE ${META} SET body=? WHERE id=1`).run(JSON.stringify(state));}
function capture(db:Sqlite,state:State) {
  const present=new Set<string>();
  for(const table of Object.keys(keys)){
    for(const raw of db.prepare(`SELECT * FROM ${table}`).all()){
      const row=normalize(table,raw),r=record(table,row),id=recordId(table,r.key);present.add(id);
      if(!state.entries[id] || !same(state.entries[id].value,row))edit(state,r);
    }
  }
  for(const [id,e] of Object.entries(state.entries))if(!present.has(id) && e.value!==null){
    // SQLite intentionally cascades habit deletes. Retain check-in history in
    // sync state so restoring a habit recovers its check-ins without data loss.
    if(e.remote.table==='habit_checkins'){
      const parent=state.entries[recordId('habits',[e.remote.key[0]])];
      if(parent?.value===null)continue;
    }
    edit(state,{...e.remote,data:null});
  }
}
export function captureSqlite(db:Sqlite):State {
  db.exec('BEGIN IMMEDIATE');try{const state=load(db);capture(db,state);store(db,state);db.exec('COMMIT');return state;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function applySqlite(db:Sqlite,reply:Reply,sent:Mutation[]):State {
  db.exec('BEGIN IMMEDIATE');
  try{
    for(const r of reply.records)if(!keys[r.table])throw new Error('Unknown server table');
    const state=load(db);capture(db,state);reconcile(state,reply,sent);
    // Parent rows before child rows; SQL parameters for every value. Only the
    // fixed table/column whitelist is interpolated. Existing rows are upserted,
    // never REPLACE (which would fire destructive delete triggers).
    const order=Object.keys(keys).filter(t=>t!=='habit_checkins').concat('habit_checkins');
    for(const table of order){
      const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));
      for(const entry of Object.values(state.entries).filter(e=>e.remote.table===table)){
        const row=entry.value;
        if(table==='habit_checkins' && row && state.entries[recordId('habits',[row.habit_id as string])]?.value===null)continue;
        if(row===null){db.prepare(`DELETE FROM ${table} WHERE ${keys[table].map(k=>`${k}=?`).join(' AND ')}`).run(...entry.remote.key);continue;}
        if(Object.keys(row).some(k=>!columns.has(k)))throw new Error('Server sent unknown columns');
        const names=Object.keys(row),updates=names.filter(n=>!keys[table].includes(n));
        const conflict=updates.length?`DO UPDATE SET ${updates.map(n=>`${n}=excluded.${n}`).join(',')}`:'DO NOTHING';
        db.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')}) ON CONFLICT (${keys[table].join(',')}) ${conflict}`).run(...names.map(n=>row[n]));
      }
    }
    store(db,state);db.exec('COMMIT');return state;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function resolveSqlite(db:Sqlite,id:string,choice:'local'|'remote') {
  db.exec('BEGIN IMMEDIATE');try{
    const state=load(db);capture(db,state);resolve(state,id,choice);
    const entry=state.entries[id],r=entry.remote,row=entry.value;
    if(row===null)db.prepare(`DELETE FROM ${r.table} WHERE ${keys[r.table].map(k=>`${k}=?`).join(' AND ')}`).run(...r.key);
    else {const names=Object.keys(row),updates=names.filter(k=>!keys[r.table].includes(k));db.prepare(`INSERT INTO ${r.table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')}) ON CONFLICT (${keys[r.table].join(',')}) ${updates.length?'DO UPDATE SET '+updates.map(k=>`${k}=excluded.${k}`).join(','):'DO NOTHING'}`).run(...names.map(k=>row[k]));}
    store(db,state);db.exec('COMMIT');return state;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
