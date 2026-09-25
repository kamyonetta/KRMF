/** Explicit test-first Mac sync bridge. Requires Node 24; no new packages. */
import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { writeFileSync, existsSync, chmodSync, realpathSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { initializeSqlite, captureSqlite, applySqlite, resolveSqlite } from '../src/companion/sqlite-sync.ts';
import { pending, type Reply } from '../src/companion/sync.ts';
const args=process.argv.slice(2);
const option=(name:string)=>args[args.indexOf(name)+1];
if(!args.includes('--database') || !args.includes('--endpoint') || !args.includes('--user'))throw new Error('Required: --database TEST_COPY.db --endpoint https://STAGING/wp-json/krmf/v1/sync --user WORDPRESS_USER. Default: one sync. --watch repeats.');
if(!existsSync(resolve(option('--database'))))throw new Error('The test database must already exist.');
const path=realpathSync(resolve(option('--database'))), endpoint=new URL(option('--endpoint')), user=option('--user');
if(endpoint.protocol!=='https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !endpoint.pathname.endsWith('/wp-json/krmf/v1/sync'))throw new Error('Use the exact HTTPS sync endpoint, without credentials or query parameters.');
if(!args.includes('--allow-real-data') && /Library|krmf\.db$/i.test(path))throw new Error('Real-data path refused. Use an isolated test copy. Real-data rollout requires explicit review and --allow-real-data.');
const db=new DatabaseSync(path,{open:true});db.exec('PRAGMA busy_timeout=10000');db.exec('PRAGMA foreign_keys=ON');
// Consistent SQLite backup before any metadata writes; no copy of live WAL files.
const backupPath=`${path}.before-sync-${Date.now()}.db`;
await backup(db,backupPath);chmodSync(backupPath,0o600);
initializeSqlite(db,`${endpoint.origin}${endpoint.pathname}|${user}`);
if(args.includes('--resolve')) {
  const choice=option('--keep');if(choice!=='local' && choice!=='remote')throw new Error('--resolve requires --keep local or --keep remote');
  resolveSqlite(db,option('--resolve'),choice);console.log('Conflict choice saved; both versions remain in resolution history.');db.close();process.exit(0);
}
const rl=createInterface({input:stdin,output:stdout});
console.log('Use a dedicated KRMF-only WordPress account application password. It is held only in process memory.');
// Read the secret from stdin with echo suppressed on the TTY; never argv, env,
// browser storage, source code, or logs. Non-TTY automation is intentionally refused.
if(!stdin.isTTY)throw new Error('Run in an interactive terminal to enter the application password.');
rl.close();
const password=await new Promise<string>((ok,no)=>{
  stdout.write('Application password (hidden): ');stdin.setRawMode(true);stdin.resume();let secret='';
  const handler=(bytes:Buffer)=>{for(const ch of bytes.toString()){if(ch==='\u0003'){stdin.setRawMode(false);stdin.off('data',handler);no(new Error('Cancelled'));return;}if(ch==='\r'||ch==='\n'){stdin.setRawMode(false);stdin.off('data',handler);stdin.pause();stdout.write('\n');ok(secret);return;}if(ch==='\u007f')secret=secret.slice(0,-1);else secret+=ch;}};stdin.on('data',handler);
});
const auth='Basic '+Buffer.from(`${user}:${password}`).toString('base64');
let running=false;
async function sync(){
  if(running)return;running=true;try{
  const state=captureSqlite(db), sent=pending(state).slice(0,100);
  const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({protocol:1,changes:sent}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Sync HTTP ${response.status}; local edits retained. Check staging login and capability.`);
  const next=applySqlite(db,await response.json() as Reply,sent);
  const conflicts=Object.values(next.entries).filter(e=>e.conflict).length;
  console.log(`Synced: ${pending(next).length} pending, ${conflicts} conflicts. Mac SQLite retained.`);
  if(conflicts){const file=`${path}.conflicts-${Date.now()}.json`;writeFileSync(file,JSON.stringify(next,null,2),{mode:0o600});console.log('Conflict backup saved next to the test database. Use --resolve RECORD_ID --keep local|remote after reviewing both versions.');}
  }finally{running=false;}
}
try{await sync();if(args.includes('--watch'))setInterval(()=>void sync().catch(e=>console.error(e.message)),30000);else db.close();}catch(e){db.close();throw e;}
