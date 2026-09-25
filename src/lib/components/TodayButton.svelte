<script lang="ts">
  let { label, onclick, disabled = false }: { label: string; onclick: () => void; disabled?: boolean } = $props();
</script>
<button class="triangle-button today-button" aria-label={label} title={label} {onclick} {disabled}>
  <svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">
    <path fill="#999" d="M10 3v5h9v3h3v9h-3v3H8v-4h10v-7h-8v5L2 10z"/>
    <path fill="white" d="M8 1v5h9v3h3v9h-3v3H6v-4h10v-7H8v5L0 8z"/>
  </svg>
</button>
<style>.today-button { width: 25px; height: 25px; margin-left: -8px; }</style>
