import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, edit, pending, reconcile, resolve, recordId, type Mutation, type Remote, type Reply } from '../src/companion/sync.ts';
const value = (text:string|null) => ({table:'daily_notes',key:['2026-09-21'],data:text===null?null:{plan_date:'2026-09-21',body:text}});
const id=recordId('daily_notes',['2026-09-21']);
function server() {
  const records: Record<string,Remote>={}, receipts:Record<string,Reply['results'][number]>={};
  return (changes:Mutation[]):Reply=>({protocol:1, results:changes.map(m=>{
    if(receipts[m.mutation])return receipts[m.mutation];
    const current=records[m.id]??{...m,version:0,data:null};
    if(current.version!==m.base)return {mutation:m.mutation,status:'conflict',record:current};
    const record={id:m.id,table:m.table,key:m.key,data:m.data,version:current.version+1};records[m.id]=record;
    return receipts[m.mutation]={mutation:m.mutation,status:'accepted',record};
  }), records:Object.values(records)});
}
test('two devices retain concurrent offline edits and resolve explicitly',()=>{
  const exchange=server(), mac=emptyState(), web=emptyState();
  edit(mac,value('original'));let sent=pending(mac);reconcile(mac,exchange(sent),sent);reconcile(web,exchange([]),[]);
  edit(mac,value('Mac offline'));edit(web,value('iPhone offline'));
  sent=pending(mac);reconcile(mac,exchange(sent),sent);
  sent=pending(web);reconcile(web,exchange(sent),sent);
  assert.equal(web.entries[id].value?.body,'iPhone offline');assert.equal(web.entries[id].conflict?.data?.body,'Mac offline');
  assert.equal(pending(web).length,0);resolve(web,id,'local');sent=pending(web);reconcile(web,exchange(sent),sent);reconcile(mac,exchange([]),[]);
  assert.equal(mac.entries[id].value?.body,'iPhone offline');
});
test('delete versus edit conflicts, tombstone prevents stale resurrection',()=>{
  const exchange=server(), a=emptyState(), b=emptyState();
  edit(a,value('hello'));let sent=pending(a);reconcile(a,exchange(sent),sent);reconcile(b,exchange([]),[]);
  edit(a,value(null));sent=pending(a);reconcile(a,exchange(sent),sent);
  edit(b,value('offline change'));sent=pending(b);reconcile(b,exchange(sent),sent);
  assert.equal(b.entries[id].conflict?.data,null);assert.equal(b.entries[id].value?.body,'offline change');
  resolve(b,id,'remote');assert.equal(b.entries[id].value,null);assert.equal(b.entries[id].remote.version,2);
});
test('lost response replay does not duplicate edits, later remote change remains visible',()=>{
  const exchange=server(), a=emptyState(), b=emptyState();edit(a,value('a'));const sent=pending(a);exchange(sent);
  reconcile(b,exchange([]),[]);edit(b,value('b'));let other=pending(b);reconcile(b,exchange(other),other);
  reconcile(a,exchange(sent),sent);assert.equal(a.entries[id].value?.body,'b');assert.equal(a.entries[id].remote.version,2);
});
test('typing during network request survives acknowledgement and rebases next mutation',()=>{
  const exchange=server(), a=emptyState();edit(a,value('first'));const sent=pending(a);const reply=exchange(sent);edit(a,value('newer'));
  reconcile(a,reply,sent);assert.equal(a.entries[id].value?.body,'newer');assert.equal(pending(a)[0].base,1);
  const next=pending(a);reconcile(a,exchange(next),next);assert.equal(a.entries[id].remote.data?.body,'newer');
});
test('state survives serialization with pending deletions and conflicts',()=>{
  const a=emptyState();edit(a,value(null));const copy=JSON.parse(JSON.stringify(a));assert.deepEqual(pending(copy),pending(a));
});
