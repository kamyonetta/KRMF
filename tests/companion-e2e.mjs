// Run with Node 24 and an external WordPress PHP.wasm package directory.
// No test/runtime dependency is added to the Mac application.
import { pathToFileURL } from 'node:url';
import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initializeSqlite,captureSqlite,applySqlite,resolveSqlite } from '../src/companion/sqlite-sync.ts';
import { emptyState,edit,pending,reconcile,recordId } from '../src/companion/sync.ts';
const root=process.argv[2];if(!root)throw new Error('Pass the external node_modules/@php-wasm directory');
const {PHP,loadPHPRuntime}=await import(pathToFileURL(root+'/universal/index.js').href);
const {getPHPLoaderModule}=await import(pathToFileURL(root+'/node-8-3/index.js').href);
const php=new PHP(await loadPHPRuntime(await getPHPLoaderModule()));
php.writeFile('/protocol.php',readFileSync('wordpress/krmf-companion/protocol.php'));
async function exchange(changes){
 php.writeFile('/request.json',JSON.stringify({protocol:1,changes}));
 const response=await php.run({code:`<?php require '/protocol.php'; $s=file_exists('/state.json')?json_decode(file_get_contents('/state.json'),true):['records'=>[],'receipts'=>[]]; $r=json_decode(file_get_contents('/request.json'),true); krmf_validate_request($r); $reply=krmf_exchange($s,$r); file_put_contents('/state.json',json_encode($s)); echo json_encode($reply);`});
 if(response.errors || response.exitCode)throw new Error(response.errors);return JSON.parse(response.text);
}
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync('src-tauri/migrations').sort())db.exec(readFileSync(`src-tauri/migrations/${f}`,'utf8'));
initializeSqlite(db,'test-user');
const web=emptyState(),date='2026-09-21',id=recordId('daily_notes',[date]);
const note=body=>({table:'daily_notes',key:[date],data:body===null?null:{plan_date:date,body}});
async function macSync(){const sent=pending(captureSqlite(db));return applySqlite(db,await exchange(sent),sent);}
async function webSync(){const sent=pending(web);reconcile(web,await exchange(sent),sent);}
db.prepare('INSERT INTO daily_notes VALUES(?,?)').run(date,'Mac to iPhone');await macSync();await webSync();
assert.equal(web.entries[id].value.body,'Mac to iPhone');
edit(web,note('iPhone to Mac'));await webSync();await macSync();assert.equal(db.prepare('SELECT body FROM daily_notes').get().body,'iPhone to Mac');
// Both devices edit offline. PHP CAS must preserve both.
db.prepare('UPDATE daily_notes SET body=?').run('Mac offline');edit(web,note('iPhone offline'));await webSync();let mac=await macSync();
assert.equal(mac.entries[id].value.body,'Mac offline');assert.equal(mac.entries[id].conflict.data.body,'iPhone offline');
resolveSqlite(db,id,'remote');assert.equal(db.prepare('SELECT body FROM daily_notes').get().body,'iPhone offline');
assert.equal(captureSqlite(db).resolutions.length,1);
// Lost acknowledgement with additional server edit.
edit(web,note('response lost'));const sent=pending(web);await exchange(sent);
await macSync();db.prepare('UPDATE daily_notes SET body=?').run('later on Mac');await macSync();reconcile(web,await exchange(sent),sent);
assert.equal(web.entries[id].value.body,'later on Mac');
// Browser deletion reaches SQLite, survives restart, can be restored.
edit(web,note(null));await webSync();await macSync();assert.equal(db.prepare('SELECT count(*) AS n FROM daily_notes').get().n,0);
assert.equal(web.entries[id].deletedData.body,'later on Mac');edit(web,note('restored'));await webSync();await macSync();assert.equal(db.prepare('SELECT body FROM daily_notes').get().body,'restored');
db.close();console.log('PASS: actual PHP 8.3 protocol ↔ browser sync engine ↔ migrated SQLite; both directions, offline conflict resolution, lost response, delete and restore');
