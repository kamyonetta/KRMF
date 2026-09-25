import { mount } from 'svelte';
import Companion from './Companion.svelte';
import './mobile.css';
mount(Companion, { target: document.getElementById('app')! });
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(async()=>{
    const registration=await navigator.serviceWorker.ready;
    registration.active?.postMessage({type:'KRMF_PRIME',assets:performance.getEntriesByType('resource').map(r=>r.name)});
  }).catch(console.warn);
}
