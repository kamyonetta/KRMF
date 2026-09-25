<script lang="ts">
  let { kind }: { kind: string } = $props();
</script>

<!-- Hand-drawn pixel objects: shared ink, cream highlights and warm stepped shading. -->
<svg class="pixel-icon {kind}" viewBox="0 0 48 48" aria-hidden="true" shape-rendering="crispEdges">
  <path d="M10 43h28v2H10zM15 45h18v1H15z" fill="#291738" opacity=".3"/>
  <g class="icon-body">
    {#if kind === 'calendar'}
      <!-- A well-loved tear-off desk calendar, with a curled corner. -->
      <path fill="#291738" d="M8 10h29v3h3v28h-3v3H9v-3H6V13h2z"/>
      <path fill="#78405e" d="M35 15h3v25H12v2h25V15z"/>
      <path fill="#eaba79" d="M9 15h26v23H9zM12 38h23v2H12z"/>
      <path fill="#fff0ba" d="M9 13h25v19h-3v4H9z"/>
      <path fill="#ff9348" d="M9 12h25v9H9z"/>
      <path fill="#f15b67" d="M9 18h25v5H9z"/>
      <path fill="#bc365e" d="M9 21h25v2H9z"/>
      <path fill="#ffe878" d="M10 13h23v2H10z"/>
      <path fill="#291738" d="M13 7h4v10h-4zM26 7h4v10h-4z"/>
      <path fill="#fff7db" d="M14 8h1v7h-1zM27 8h1v7h-1zM10 24h2v10h-2z"/>
      <g class="calendar-dates">
        <path fill="#9e705c" d="M14 26h3v2h-3zM21 26h3v2h-3zM28 26h3v2h-3zM14 31h3v2h-3z"/>
        <path fill="#e74b70" d="M21 30h2v1h1v-1h2v3h-1v1h-2v-1h-2z"/>
      </g>
      <path fill="#d59b65" d="M31 32h4v4h-4z"/><path fill="#fff9db" d="M31 32h4l-4 4z"/>
      <path fill="#ffb45c" d="M11 19h1v1h-1zM15 20h1v1h-1zM29 19h2v1h-2z"/>
    {:else if kind === 'planner'}
      <!-- A chunky purple school diary with a star sticker and pencil. -->
      <path fill="#291738" d="M10 7h25v3h3v30h-3v3H8V10h2z"/>
      <path fill="#6c365e" d="M11 12h25v27H11z"/>
      <path fill="#e3b777" d="M11 37h23v4H11z"/><path fill="#fff0c2" d="M12 37h22v2H12z"/>
      <path fill="#9e659e" d="M10 9h23v27H10z"/><path fill="#bf83b2" d="M12 10h19v3H12z"/>
      <path fill="#67395f" d="M10 9h5v27h-5z"/><path fill="#dc9bbb" d="M11 11h1v23h-1z"/>
      <path fill="#ffce4b" d="M23 15h3v4h4v3h-3v4h-3v-3h-4v-3h3z"/>
      <path fill="#fff4b2" d="M24 16h1v5h-3v-1h2z"/>
      <path fill="#e65472" d="M27 35h4v9l-2-2-2 2z"/>
      <path fill="#70476d" d="M17 29h2v2h-2zM20 32h2v2h-2zM29 28h2v2h-2z"/>
      <g class="pencil">
        <path fill="#291738" d="M37 4h5v27h-1v3h-3v-3h-1z"/>
        <path fill="#f27999" d="M38 5h3v5h-3z"/><path fill="#fff1c1" d="M38 10h3v2h-3z"/>
        <path fill="#ffb93f" d="M38 12h3v17h-3z"/><path fill="#fff08b" d="M38 12h1v16h-1z"/>
        <path fill="#e3b777" d="M38 29h3v2h-1v2h-1v-2h-1z"/>
      </g>
    {:else if kind === 'todo'}
      <!-- A little assignment sheet on an orange clipboard. -->
      <path fill="#291738" d="M10 8h25v3h3v29h-3v3H10v-2H7V11h3z"/>
      <path fill="#994b58" d="M33 12h3v28H12v1h23z"/>
      <path fill="#ee9a4f" d="M10 10h23v29H10z"/><path fill="#ffcd71" d="M11 11h20v2H11z"/>
      <path fill="#d57051" d="M12 15h21v22H12z"/><path fill="#fff0bf" d="M12 14h19v21H12z"/>
      <path fill="#fff9df" d="M13 15h2v18h-2z"/>
      <path fill="#291738" d="M17 6h11v3h2v7H15V9h2z"/>
      <path fill="#b78095" d="M18 8h8v3h2v3H17v-3h1z"/><path fill="#f8cfb6" d="M19 9h5v2h-5z"/>
      <path fill="#be9b77" d="M22 20h7v2h-7zM22 26h7v2h-7zM22 31h5v1h-5z"/>
      <path class="checkmark" fill="#468454" d="M15 20h2v2h1v-4h2v6h-3v-1h-2z"/>
      <path fill="#739b5a" d="M16 27h3v2h-3zM16 31h3v1h-3z"/>
      <path fill="#f05d7b" d="M29 32h3v2h3v3h-3v2h-3v-2h-2v-3h2z"/>
      <path fill="#ffc36d" d="M30 34h2v2h-2z"/>
    {:else}
      <!-- A friendly classroom plant; each check-in helps it grow. -->
      <path fill="#291738" d="M12 28h26v7h-3v7h-3v2H17v-2h-3v-7h-2z"/>
      <path fill="#c85167" d="M16 33h18v7h-3v2H19v-2h-3z"/>
      <path fill="#f18568" d="M16 33h13v7H19v-2h-3z"/>
      <path fill="#ffbc76" d="M14 30h22v3H14z"/><path fill="#fff0ae" d="M15 30h18v1H15z"/>
      <path fill="#753e50" d="M19 36h2v2h-2zM28 36h2v2h-2zM22 39h5v1h-5z"/>
      <g class="sprout">
        <path fill="#291738" d="M23 16h4v13h-4zM9 10h9v2h4v4h3v6h-9v-3h-4v-4H9zM27 7h5V5h9v8h-3v4h-5v3h-7V10h1z"/>
        <path fill="#548549" d="M25 17h1v12h-1zM12 12h6v3h4v5h-6v-3h-4zM28 10h5V7h6v5h-4v4h-6v2h-1z"/>
        <path fill="#9bc84b" d="M12 12h6v2h-4v2h-2zM30 10h5V8h4v2h-3v3h-6z"/>
        <path fill="#dbe77a" d="M13 12h3v1h-3zM34 8h4v1h-4z"/>
      </g>
    {/if}
  </g>
  <g class="icon-sparkles" fill="#ffe786">
    <path d="M5 4h2v3h3v2H7v3H5V9H2V7h3z"/>
    <path d="M41 36h2v2h2v2h-2v2h-2v-2h-2v-2h2z"/>
  </g>
</svg>

<style>
  .icon-sparkles { opacity: 0; }
  :global(.module-card:is(:hover, :focus-visible)) .icon-sparkles { animation: sparkle 1.2s steps(3, end) infinite; }
  @keyframes sparkle { 0%, 100% { opacity: 0; } 30%, 75% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { :global(.module-card:is(:hover, :focus-visible)) .icon-sparkles { animation: none; opacity: 1; } }
</style>
