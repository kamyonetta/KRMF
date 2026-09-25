<script lang="ts">
  let { label, onclick, disabled = false }: { label: string; onclick: () => void; disabled?: boolean } = $props();
</script>
<button class="delete-todo" aria-label={label} title="Delete to-do" {onclick} {disabled}>
  <svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path fill="white" d="M1 1h2v2h2v2h2V3h2V1h2v2H9v2H7v2h2v2h2v2H9V9H7V7H5v2H3v2H1V9h2V7h2V5H3V3H1z"/></svg>
</button>
<style>
.delete-todo { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; padding: 3px; border: 0; background: transparent; }
.delete-todo svg { width: 14px; height: 14px; filter: drop-shadow(1px 1px 0 #4e4033); }
.delete-todo:hover:enabled { background: #ffffff22; }
</style>
