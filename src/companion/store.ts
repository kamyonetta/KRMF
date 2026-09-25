import { emptyState, edit, pending, reconcile, resolve, type State, type Reply, type Row } from './sync.ts';
import { record } from './schema.ts';
export type Session = { user: number; endpoint: string; nonce: string; logout: string; site: string };
declare global { interface Window { KRMF_SESSION?: Session } }
const preview = import.meta.env.MODE === 'preview';
let db: IDBDatabase;
let scope: string;
export const isPreview = preview;
export async function initialize() {
  if (!preview && window.KRMF_SESSION) {
    const {user,site,endpoint} = window.KRMF_SESSION;
    localStorage.setItem('krmf-offline-account',JSON.stringify({user,site,endpoint,nonce:'',logout:''}));
  }
  if (!preview && !window.KRMF_SESSION && !navigator.onLine) {
    const saved=localStorage.getItem('krmf-offline-account');
    if(saved)window.KRMF_SESSION=JSON.parse(saved);
  }
  if (!preview && !window.KRMF_SESSION) throw new Error('Sign in through your private KRMF page.');
  scope = preview ? 'preview-v1' : `${window.KRMF_SESSION!.site}:${window.KRMF_SESSION!.user}`;
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('krmf-companion-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  return read();
}
export function read(): Promise<State> {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readonly'), request = tx.objectStore('state').get(scope);
    request.onsuccess = () => resolve(request.result ?? emptyState()); request.onerror = () => reject(request.error);
  });
}
// Read + modify + write in ONE IndexedDB transaction: safe across tabs, crash atomic.
function change(fn: (state: State) => void): Promise<State> {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readwrite'), store = tx.objectStore('state'), request = store.get(scope);
    let state: State;
    request.onsuccess = () => { try { state = request.result ?? emptyState(); fn(state); store.put(state,scope); } catch (e) { tx.abort(); reject(e); } };
    tx.oncomplete = () => resolve(state); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('Local save failed'));
  });
}
export function save(table: string, data: Row, deleted = false) { return change(state => { const r = record(table,data); edit(state,{...r,data:deleted ? null : data}); }); }
export function choose(id: string, choice: 'local'|'remote') { return change(state => resolve(state,id,choice)); }
export async function synchronize(): Promise<State> {
  if (preview) return read();
  if (!navigator.locks) throw new Error('This browser needs Web Locks support for safe sync. Local edits are retained.');
  return navigator.locks.request(`krmf-sync:${scope}`, async () => {
    const outgoing = pending(await read()).slice(0,100);
    const session = window.KRMF_SESSION!;
    const headers:Record<string,string>={'Content-Type':'application/json'};if(session.nonce)headers['X-WP-Nonce']=session.nonce;
    const response = await fetch(session.endpoint, { method:'POST', credentials:'same-origin', cache:'no-store', headers, body:JSON.stringify({protocol:1,changes:outgoing}), signal:AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in again to sync. Offline edits are safe on this device.' : `Sync failed (${response.status}). Edits remain on this device.`);
    const reply = await response.json() as Reply;
    return change(state => reconcile(state,reply,outgoing));
  });
}
export async function exportBackup() {
  const blob = new Blob([JSON.stringify(await read(),null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href=url; a.download='krmf-companion-backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function signOut() {
  const state=await read();
  if(Object.values(state.entries).some(e=>e.pending || e.conflict))throw new Error('Sync or resolve your changes before signing out. Export a backup if you need to keep an offline copy.');
  const target=window.KRMF_SESSION?.logout;
  if(!target)throw new Error('Reconnect and reload before signing out.');
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').delete(scope);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  localStorage.removeItem('krmf-offline-account');
  location.assign(target);
}
