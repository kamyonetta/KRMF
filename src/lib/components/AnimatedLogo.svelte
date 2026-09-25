<script lang="ts">
  // Angled clipping boundaries follow the gaps between the original letters.
  // All four pieces retain their original coordinates at the resting scale.
  const letters = [
    { name: 'K', origin: '280px 450px', clip: 'polygon(0 0, 505px 0, 505px 180px, 550px 265px, 418px 380px, 405px 437px, 535px 565px, 490px 635px, 430px 740px, 400px 887px, 0 887px)' },
    { name: 'R', origin: '680px 450px', clip: 'polygon(505px 0, 905px 0, 905px 330px, 850px 425px, 875px 550px, 890px 635px, 810px 887px, 400px 887px, 430px 740px, 490px 635px, 535px 565px, 405px 437px, 418px 380px, 550px 265px, 505px 180px)' },
    { name: 'M', origin: '1120px 470px', clip: 'polygon(905px 0, 1290px 0, 1290px 320px, 1330px 435px, 1355px 535px, 1410px 630px, 1400px 887px, 810px 887px, 890px 635px, 875px 550px, 850px 425px, 905px 330px)' },
    { name: 'F', origin: '1510px 450px', clip: 'polygon(1290px 0, 1774px 0, 1774px 887px, 1400px 887px, 1410px 630px, 1355px 535px, 1330px 435px, 1290px 320px)' },
  ];
</script>

<svg class="krmf-logo" viewBox="0 0 1774 887" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  {#each letters as letter, i}
    <g class="logo-letter" style:transform-origin={letter.origin} style:animation-delay={`${i * 0.22}s`}>
      <image href="/art/krmf-logo.png" width="1774" height="887" style:clip-path={letter.clip}/>
    </g>
  {/each}
</svg>

<style>
  svg { overflow: visible; }
  .logo-letter { animation: letter-pulse 3.2s ease-in-out infinite; transform-box: view-box; }
  @keyframes letter-pulse {
    0%, 38%, 100% { transform: scale(1); }
    17% { transform: scale(1.12); }
  }
  @media (prefers-reduced-motion: reduce) { .logo-letter { animation: none; } }
</style>
