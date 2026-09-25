import type Database from '@tauri-apps/plugin-sql';
import { keys, record } from '../companion/schema';
import { emptyState, edit, pending, reconcile, same, type Reply, type Row, type State } from '../companion/sync';

const ENDPOINT='https://www.sacmaca.com/wp-json/krmf/v1/sync';
const META='_krmf_companion_state';
let running=false, timer:ReturnType<typeof setTimeout>|undefined;

async function load(db:Database):Promise<State>{
  await db.execute(`CREATE TABLE IF NOT EXISTS ${META}(id INTEGER PRIMARY KEY CHECK(id=1),body TEXT NOT NULL)`);
  const rows=await db.select<{body:string}[]>(`SELECT body FROM ${META} WHERE id=1`);
  if(!rows.length){const state=emptyState();await db.execute(`INSERT INTO ${META}(id,body) VALUES(1,$1)`,[JSON.stringify(state)]);return state;}
  return JSON.parse(rows[0].body);
}
async function save(db:Database,state:State){await db.execute(`UPDATE ${META} SET body=$1 WHERE id=1`,[JSON.stringify(state)]);}
async function capture(db:Database,state:State){
  const present=new Set<string>();
  for(const table of Object.keys(keys))for(const raw of await db.select<Row[]>(`SELECT * FROM ${table}`)){
    const item=record(table,raw),id=JSON.stringify([table,...item.key]);present.add(id);
    if(!state.entries[id]||!same(state.entries[id].value,raw))edit(state,item);
  }
  for(const [id,entry] of Object.entries(state.entries))if(!present.has(id)&&entry.value!==null)edit(state,{...entry.remote,data:null});
}
async function apply(db:Database,state:State){
  for(const table of Object.keys(keys))for(const entry of Object.values(state.entries).filter(e=>e.remote.table===table)){
    if(entry.conflict){entry.remote=entry.conflict;delete entry.conflict;edit(state,{...entry.remote,data:entry.value});continue;}
    const row=entry.value;
    if(row===null){await db.execute(`DELETE FROM ${table} WHERE ${keys[table].map((k,i)=>`${k}=$${i+1}`).join(' AND ')}`,entry.remote.key);continue;}
    const names=Object.keys(row),updates=names.filter(n=>!keys[table].includes(n));
    await db.execute(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (${keys[table].join(',')}) ${updates.length?'DO UPDATE SET '+updates.map(n=>`${n}=excluded.${n}`).join(','):'DO NOTHING'}`,names.map(n=>row[n]));
  }
}
export async function syncNow(db:Database){
  if(running)return;running=true;
  try{
    const state=await load(db);await capture(db,state);const sent=pending(state);
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-KRMF-Password':'123'},body:JSON.stringify({protocol:1,changes:sent})});
    if(!response.ok)throw new Error(`KRMF sync ${response.status}`);
    reconcile(state,await response.json() as Reply,sent);await apply(db,state);await save(db,state);
  }catch(error){console.error(error);}finally{running=false;}
}
export function queueSync(db:Database){clearTimeout(timer);timer=setTimeout(()=>void syncNow(db),1200);}
