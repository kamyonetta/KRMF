<script lang="ts">let { light }: { light: boolean } = $props();</script>
<svg viewBox="0 0 48 48" aria-hidden="true" shape-rendering="crispEdges">
  <path fill="#291738" opacity=".3" d="M12 43h26v2H12zM17 45h16v1H17z"/>
  <g class="celestial-body">
    {#if light}
      <g fill="#291738"><path d="M20 2h8v9h-8zM20 36h8v9h-8zM2 20h9v8H2zM37 20h9v8h-9zM7 7h8v8H7zM33 7h8v8h-8zM7 33h8v8H7zM33 33h8v8h-8z"/></g>
      <path fill="#df693d" d="M23 4h3v7h-3zM23 36h3v7h-3zM4 23h7v3H4zM37 23h7v3h-7zM9 9h4v4H9zM35 9h4v4h-4zM9 35h4v4H9zM35 35h4v4h-4z"/>
      <path fill="#ffe477" d="M21 3h3v6h-3zM21 37h3v5h-3zM3 21h6v3H3zM38 21h5v3h-5zM8 8h4v3H8zM34 8h4v3h-4zM8 34h4v3H8zM34 34h4v3h-4z"/>
      <path fill="#291738" d="M17 10h15v4h5v5h3v14h-4v5H17v-3h-5v-5H9V19h3v-5h5z"/>
      <path fill="#bd4b42" d="M28 15h7v5h3v12h-4v4H19v-4h9z"/>
      <path fill="#f4a22e" d="M17 12h13v4h5v14h-4v4H17v-4h-5V19h5z"/>
      <path fill="#ffd84d" d="M17 12h12v4h4v10h-4v4H16v-4h-4v-7h5z"/>
      <path fill="#fff3ad" d="M18 14h10v3H18zM15 18h3v7h-3z"/>
      <path fill="#ffe985" d="M20 19h8v6h-8z"/>
      <path fill="#e68435" d="M22 30h8v2h-8zM32 26h2v4h-2z"/>
      <!-- Small stepped flecks give the sun a textured, glowing surface. -->
      <path fill="#fff5ba" d="M19 18h2v1h-2zM23 20h1v1h-1zM17 23h1v2h-1zM26 17h2v1h-2zM29 20h1v1h-1z"/>
      <path fill="#f5b337" d="M19 27h2v1h-2zM23 28h1v1h-1zM28 25h2v2h-2zM31 22h1v2h-1zM17 29h1v1h-1z"/>
      <path fill="#ffe778" d="M19 32h2v1h-2zM29 29h2v1h-2zM34 19h1v3h-1z"/>
      <path fill="#fff4cb" d="M21 4h1v3h-1zM4 21h3v1H4zM9 8h2v1H9zM35 8h2v1h-2z"/>
    {:else}
      <path fill="#291738" d="M20 4h10v5h-5v5h-3v9h4v4h8v-3h6v8h-3v6h-6v4H18v-3h-6v-5H8V17h3v-6h5V7h4z"/>
      <path fill="#ad663a" d="M14 14h7v12h5v4h11v3h-3v4h-5v3H19v-3h-5v-5h-4V18h4z"/>
      <path fill="#f6cf61" d="M20 6h7v2h-5v5h-3v11h4v5h10v-2h4v4h-5v5H19v-3h-5v-5h-3V18h3v-6h6z"/>
      <path fill="#fff3bb" d="M20 7h4v2h-4v5h-4v7h-3v-4h2v-6h5zM14 23h3v6h-3zM18 30h5v3h-5z"/>
      <path fill="#d89b42" d="M18 19h3v5h-3zM23 30h5v4h-5zM16 26h3v3h-3z"/>
      <!-- Recessed golden craters with light upper rims. -->
      <path fill="#bc7c37" d="M14 18h3v1h1v3h-1v1h-3v-1h-1v-3h1zM20 30h3v1h1v2h-1v1h-3v-1h-1v-2h1zM15 26h2v2h-2z"/>
      <path fill="#e9b64c" d="M14 19h3v3h-3zM20 31h3v2h-3z"/>
      <path fill="#fff2ac" d="M14 18h3v1h-3zM20 30h3v1h-3zM15 25h2v1h-2zM19 10h2v1h-2zM12 24h1v2h-1zM28 32h2v1h-2z"/>
      <path fill="#dfaa43" d="M17 15h1v2h-1zM18 28h1v1h-1zM25 34h2v1h-2zM30 30h1v1h-1z"/>
      <path fill="#fff1ac" d="M36 5h3v4h4v3h-4v4h-3v-4h-4V9h4zM40 20h3v3h-3z"/>
      <path fill="#fffbea" d="M36 8h3v3h-3z"/>
    {/if}
  </g>
</svg>
<style>.celestial-body { transform-origin: center; transition: transform .2s steps(3); }:global(.theme-switch:hover) .celestial-body { transform: translateY(-2px) rotate(-5deg); } @media(prefers-reduced-motion:reduce) { .celestial-body { transition:none; } }</style>
