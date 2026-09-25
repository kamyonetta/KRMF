/** Wire protocol v1. Null is a retained deletion, never an absent record. */
export type Row = Record<string, string | number | null>;
export type RecordValue = { table: string; key: (string | number)[]; data: Row | null };
export type Remote = RecordValue & { id: string; version: number };
export type Mutation = RecordValue & { id: string; mutation: string; base: number };
export type Entry = { remote: Remote; value: Row | null; pending?: Mutation; conflict?: Remote; deletedData?: Row };
export type State = { protocol: 1; entries: Record<string, Entry>; resolutions?: {id:string;local:Row|null;remote:Remote;choice:string}[] };
export type Reply = { protocol: 1; records: Remote[]; results: { mutation: string; status: 'accepted' | 'conflict'; record: Remote }[] };
export const emptyState = (): State => ({ protocol: 1, entries: {} });
export const recordId = (table: string, key: (string | number)[]) => JSON.stringify([table, ...key]);
export function same(a: unknown, b: unknown): boolean {
  const canonical = (x: unknown): string => JSON.stringify(x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a],[b]) => a.localeCompare(b))) : x);
  return canonical(a) === canonical(b);
}
export function edit(state: State, value: RecordValue, mutation = crypto.randomUUID()) {
  const id = recordId(value.table, value.key);
  const entry = state.entries[id] ?? { remote: { ...value, data: null, id, version: 0 }, value: null };
  if(value.data===null && entry.value)entry.deletedData=structuredClone(entry.value);
  entry.value = structuredClone(value.data);
  // A deliberate conflict resolution is required; typing must not discard the remote version.
  entry.pending = { ...value, id, mutation, base: entry.remote.version };
  state.entries[id] = entry;
}
export function pending(state: State): Mutation[] {
  return Object.values(state.entries).filter(e => e.pending && !e.conflict).map(e => structuredClone(e.pending!));
}
export function reconcile(state: State, reply: Reply, sent: Mutation[]) {
  if (reply.protocol !== 1) throw new Error('Unsupported sync protocol');
  if(!Array.isArray(reply.records) || !Array.isArray(reply.results))throw new Error('Invalid server reply');
  for(const r of [...reply.records,...reply.results.map(r=>r.record)]) {
    if(!r || !Array.isArray(r.key) || r.id!==recordId(r.table,r.key) || !Number.isSafeInteger(r.version) || r.version<0 || (r.data!==null && (typeof r.data!=='object' || Array.isArray(r.data))))throw new Error('Invalid server record');
  }
  const versions=new Map(reply.records.map(r=>[r.id,r.version]));
  for(const entry of Object.values(state.entries))if(entry.remote.version>0 && (versions.get(entry.remote.id)??-1)<entry.remote.version)throw new Error('Server history is older or incomplete. Sync stopped; restore the matching server backup before continuing.');
  for (const result of reply.results) {
    const outgoing = sent.find(m => m.mutation === result.mutation);
    if (!outgoing) throw new Error('Unexpected sync acknowledgement');
    const entry = state.entries[outgoing.id];
    if (!entry) throw new Error('Missing local edit');
    if (result.status === 'conflict') { entry.conflict = result.record; continue; }
    entry.remote = result.record;
    if (entry.pending?.mutation === outgoing.mutation) { entry.value = result.record.data; delete entry.pending; }
    else if (entry.pending) entry.pending.base = result.record.version;
  }
  for (const remote of reply.records) {
    const entry = state.entries[remote.id];
    if (!entry) { state.entries[remote.id] = { remote, value: remote.data }; continue; }
    if (remote.version <= entry.remote.version) continue;
    if (entry.pending || entry.conflict) entry.conflict = remote;
    else { if(remote.data===null && entry.value)entry.deletedData=structuredClone(entry.value); entry.remote = remote; entry.value = remote.data; }
  }
}
export function resolve(state: State, id: string, choice: 'local' | 'remote') {
  const entry = state.entries[id];
  if (!entry?.conflict) throw new Error('Conflict no longer exists');
  (state.resolutions ??= []).push({id,local:structuredClone(entry.value),remote:structuredClone(entry.conflict),choice});
  entry.remote = entry.conflict;
  delete entry.conflict;
  if (choice === 'remote') { entry.value = entry.remote.data; delete entry.pending; }
  else edit(state, { ...entry.remote, data: entry.value });
}
