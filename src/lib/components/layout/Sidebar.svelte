<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { story } from '$lib/stores/story.svelte';
  import { Users, MapPin, Backpack, Scroll, Clock } from 'lucide-svelte';
  import CharacterPanel from '$lib/components/world/CharacterPanel.svelte';
  import LocationPanel from '$lib/components/world/LocationPanel.svelte';
  import InventoryPanel from '$lib/components/world/InventoryPanel.svelte';
  import QuestPanel from '$lib/components/world/QuestPanel.svelte';
  import TimePanel from '$lib/components/world/TimePanel.svelte';
  import { swipe } from '$lib/utils/swipe';

  const tabs = [
    { id: 'characters' as const, icon: Users, label: 'Characters' },
    { id: 'locations' as const, icon: MapPin, label: 'Locations' },
    { id: 'inventory' as const, icon: Backpack, label: 'Inventory' },
    { id: 'quests' as const, icon: Scroll, label: 'Quests' },
    { id: 'time' as const, icon: Clock, label: 'Time' },
  ];

  function handleSwipeLeft() {
    // Navigate to next tab, or close sidebar if on last tab
    const currentIndex = tabs.findIndex(t => t.id === ui.sidebarTab);
    if (currentIndex < tabs.length - 1) {
      ui.setSidebarTab(tabs[currentIndex + 1].id);
    } else {
      // On last tab, swipe left closes sidebar
      ui.toggleSidebar();
    }
  }

  function handleSwipeRight() {
    // Navigate to previous tab
    const currentIndex = tabs.findIndex(t => t.id === ui.sidebarTab);
    if (currentIndex > 0) {
      ui.setSidebarTab(tabs[currentIndex - 1].id);
    }
  }
</script>

<aside
  class="sidebar flex h-full w-[calc(100vw-3rem)] max-w-72 flex-col border-r border-surface-700 sm:w-72"
  use:swipe={{ onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight, threshold: 50 }}
>
  <!-- Tab navigation -->
  <div class="flex border-b border-surface-700">
    {#each tabs as tab}
      <button
        class="flex flex-1 items-center justify-center gap-1.5 py-3 sm:py-3 min-h-[48px] text-sm transition-colors"
        class:text-accent-400={ui.sidebarTab === tab.id}
        class:text-surface-400={ui.sidebarTab !== tab.id}
        class:border-b-2={ui.sidebarTab === tab.id}
        class:border-accent-500={ui.sidebarTab === tab.id}
        class:hover:text-surface-200={ui.sidebarTab !== tab.id}
        onclick={() => ui.setSidebarTab(tab.id)}
        title={tab.label}
      >
        <svelte:component this={tab.icon} class="h-5 w-5 sm:h-4 sm:w-4" />
      </button>
    {/each}
  </div>

  <!-- Panel content -->
  <div class="flex-1 overflow-y-auto p-3">
    {#if ui.sidebarTab === 'characters'}
      <CharacterPanel />
    {:else if ui.sidebarTab === 'locations'}
      <LocationPanel />
    {:else if ui.sidebarTab === 'inventory'}
      <InventoryPanel />
    {:else if ui.sidebarTab === 'quests'}
      <QuestPanel />
    {:else if ui.sidebarTab === 'time'}
      <TimePanel />
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    background-color: rgb(20 27 37);
  }
</style>
