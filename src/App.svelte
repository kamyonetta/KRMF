<script lang="ts">
  import { onMount } from 'svelte';
  import { getDatabase } from './lib/database';
  import { requestWidgetSync } from './lib/widgets/sync';
  import './themes.css';
  import './fit.css';
  import './scrollbars.css';
  import './frames.css';
  import FitScreen from './lib/components/FitScreen.svelte';
  import type { CalendarLocation } from './modules/calendar/model';
  import Calendar from './modules/calendar/Calendar.svelte';
  import Planner from './modules/planner/Planner.svelte';
  import Habits from './modules/habits/Habits.svelte';
  import AnimatedLogo from './lib/components/AnimatedLogo.svelte';
  import ThemeIcon from './lib/components/ThemeIcon.svelte';
  import PixelIcon from './lib/components/PixelIcon.svelte';
  const modules = [
    { id: 'calendar', name: 'Calendar' },
    { id: 'planner', name: 'Planner' },
    { id: 'habits', name: 'Habit Tracker' },
  ];
  let lightMode = $state(false);
  onMount(() => { void getDatabase().catch(console.error); const refresh = setInterval(requestWidgetSync, 60000); try { lightMode = localStorage.getItem('krmf-theme') === 'light'; } catch {} document.documentElement.dataset.theme = lightMode ? 'light' : 'dark'; return () => clearInterval(refresh); });
  function toggleTheme() { lightMode = !lightMode; const theme = lightMode ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('krmf-theme',theme); } catch {} requestWidgetSync(); }
  let active = $state('home');
  let plannerDay = $state<string | undefined>(undefined);
  let plannerWeek = $state<string | undefined>(undefined);
  let calendarLocation = $state<CalendarLocation | undefined>(undefined);
  let fromCalendar = $state(false);
  function openPlannerDay(day: string, location: CalendarLocation) { calendarLocation = location; fromCalendar = true; plannerDay = day; active = 'planner'; }
  function backToCalendar() { plannerDay = undefined; fromCalendar = false; active = 'calendar'; }
  function selectModule(module: string) { plannerDay = undefined; fromCalendar = false; calendarLocation = undefined; active = module; }
</script>

<div class="school-app" class:at-home={active === 'home'}>
  <div class="classroom-backdrop" aria-hidden="true"></div>
  <header class="logo-header" class:compact={active !== 'home'}>
    <button class="logo-home" onclick={() => active = 'home'} aria-label="KRMF home">
      <AnimatedLogo />
    </button>
  </header>
  {#if active === 'home'}
    <button class="theme-switch" role="switch" aria-checked={lightMode} aria-label="Light mode" title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'} onclick={toggleTheme}>
      <ThemeIcon light={lightMode}/>
    </button>
    <main class="home">
      <nav class="module-grid" aria-label="Choose a module">
        {#each modules as module}
          <button class="module-card {module.id}" onclick={() => selectModule(module.id)}>
            <span class="icon-stage"><PixelIcon kind={module.id}/></span><span class="module-name">{module.name}</span>
          </button>
        {/each}
        {#each Array(9 - modules.length) as _}<div class="empty-cell" aria-hidden="true"></div>{/each}
      </nav>
    </main>
  {:else}
    <FitScreen><main class="module-page" class:habit-page={active === 'habits'} class:calendar-page={active === 'calendar' || active === 'planner'}>{#if active === 'planner' && fromCalendar}<button class="back-button" onclick={backToCalendar}>Back</button>{:else}<button class="back-button" onclick={() => active = 'home'}>Back</button>{/if}
      {#if active === 'calendar'}<Calendar onday={openPlannerDay} initialLocation={calendarLocation}/>{:else if active === 'planner'}<Planner initialDay={plannerDay} initialWeek={plannerWeek} onweek={(date) => plannerWeek = date}/>{:else}<Habits/>{/if}
    </main></FitScreen>
  {/if}
</div>
