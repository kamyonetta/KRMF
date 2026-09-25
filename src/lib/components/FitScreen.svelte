<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let frame: HTMLDivElement;
  let content: HTMLDivElement;
  let scale = $state(1);
  let navigationScale = $state(1);
  let navigationWidth = $state(1084);
  onMount(() => {
    let measurement = 0;
    const fit = () => {
      navigationScale = Math.min(1, frame.clientWidth / 1100);
      const available = Math.max(1, frame.clientHeight - 66 * navigationScale);
      scale = Math.min(1, frame.clientWidth / 1100, available / Math.max(content.offsetHeight, 1));
      cancelAnimationFrame(measurement);
      measurement = requestAnimationFrame(() => {
        const panel = content.querySelector('.calendar-shell');
        if (panel) {
          // WebKit reports rects before ancestor CSS zoom; include that compact scale.
          let zoom = 1;
          for (let element: Element | null = panel; element && element !== frame; element = element.parentElement) {
            zoom *= Number.parseFloat(getComputedStyle(element).zoom) || 1;
          }
          navigationWidth = panel.getBoundingClientRect().width * zoom / navigationScale;
        }
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(frame); observer.observe(content); fit();
    return () => { observer.disconnect(); cancelAnimationFrame(measurement); };
  });
</script>
<div class="fit-frame" bind:this={frame}>
  <div class="fit-content" bind:this={content} style:transform={`translateX(-50%) scale(${scale})`}>{@render children()}</div>
  <div class="navigation-dock" style:width={`${navigationWidth}px`} style:transform={`translateX(-50%) scale(${navigationScale})`}></div>
</div>
