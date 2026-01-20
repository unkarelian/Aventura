<script lang="ts">
  import { story } from "$lib/stores/story.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import {
    Plus,
    MapPin,
    Navigation,
    Trash2,
    Pencil,
    ChevronDown,
    ChevronUp,
  } from "lucide-svelte";
  import type { Location } from "$lib/types";

  let showAddForm = $state(false);
  let newName = $state("");
  let newDescription = $state("");
  let confirmingDeleteId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let editName = $state("");
  let editDescription = $state("");

  function toggleCollapse(locationId: string) {
    const isCollapsed = ui.isEntityCollapsed(locationId);
    ui.toggleEntityCollapsed(locationId, !isCollapsed);
  }

  function getSectionLineCount(location: Location): number {
    let lines = 0;
    if (location.description) {
      const words = location.description.split(/\s+/).length;
      lines += Math.ceil(words / 8);
    }
    return lines;
  }

  async function addLocation() {
    if (!newName.trim()) return;
    const makeCurrent = story.locations.length === 0;
    await story.addLocation(
      newName.trim(),
      newDescription.trim() || undefined,
      makeCurrent,
    );
    newName = "";
    newDescription = "";
    showAddForm = false;
  }

  async function goToLocation(locationId: string) {
    await story.setCurrentLocation(locationId);
  }

  async function toggleVisited(locationId: string) {
    await story.toggleLocationVisited(locationId);
  }

  async function deleteLocation(locationId: string) {
    await story.deleteLocation(locationId);
    confirmingDeleteId = null;
  }

  function startEdit(location: Location) {
    editingId = location.id;
    editName = location.name;
    editDescription = location.description ?? "";
  }

  function cancelEdit() {
    editingId = null;
    editName = "";
    editDescription = "";
  }

  async function saveEdit(location: Location) {
    const name = editName.trim();
    if (!name) return;
    await story.updateLocation(location.id, {
      name,
      description: editDescription.trim() || null,
    });
    cancelEdit();
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="font-medium text-surface-200">Locations</h3>
    <button
      class="sm:btn-ghost rounded p-1"
      onclick={() => (showAddForm = !showAddForm)}
      title="Add location"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>

  {#if showAddForm}
    <div class="card space-y-2">
      <input
        type="text"
        bind:value={newName}
        placeholder="Location name"
        class="input text-sm"
      />
      <textarea
        bind:value={newDescription}
        placeholder="Description (optional)"
        class="input text-sm"
        rows="2"
      ></textarea>
      <div class="flex justify-end gap-2">
        <button
          class="btn btn-secondary text-xs"
          onclick={() => (showAddForm = false)}
        >
          Cancel
        </button>
        <button
          class="btn btn-primary text-xs"
          onclick={addLocation}
          disabled={!newName.trim()}
        >
          Add
        </button>
      </div>
    </div>
  {/if}

  <!-- Current Location -->
  {#if story.currentLocation}
    {@const currentIsCollapsed = ui.isEntityCollapsed(story.currentLocation.id)}
    {@const currentSectionLineCount = getSectionLineCount(
      story.currentLocation,
    )}
    {@const currentNeedsCollapse = currentSectionLineCount > 4}
    <div class="card border-accent-500/50 bg-accent-500/10 p-3">
      <div class="flex items-center gap-2 text-accent-400">
        <Navigation class="h-4 w-4" />
        <span class="text-sm font-medium">Current Location</span>
      </div>
      <h4 class="mt-1 break-words font-medium text-surface-100">
        {story.currentLocation.name}
      </h4>
      {#if story.currentLocation.description}
        <div
          class="mt-1 space-y-2 rounded-md bg-surface-800/40"
          class:max-h-24={currentIsCollapsed && currentNeedsCollapse}
          class:overflow-hidden={currentIsCollapsed && currentNeedsCollapse}
        >
          <p class="break-words text-sm text-surface-400">
            {story.currentLocation.description}
          </p>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex items-center justify-between gap-1 mt-3 mb-1">
        <div class="flex items-center gap-1">
          <button
            class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
            onclick={() =>
              story.currentLocation && startEdit(story.currentLocation)}
            title="Edit location"
          >
            <Pencil class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="flex items-center gap-1">
          {#if currentNeedsCollapse}
            <button
              class="sm:btn-ghost rounded p-1.5 text-surface-500 hover:text-surface-200 sm:p-1"
              onclick={() =>
                story.currentLocation &&
                toggleCollapse(story.currentLocation.id)}
              title={currentIsCollapsed ? "Expand" : "Collapse"}
            >
              {#if currentIsCollapsed}
                <ChevronDown class="h-3.5 w-3.5" />
              {:else}
                <ChevronUp class="h-3.5 w-3.5" />
              {/if}
            </button>
          {/if}
        </div>
      </div>
      {#if editingId === story.currentLocation.id}
        <div class="mt-3 space-y-2">
          <input
            type="text"
            bind:value={editName}
            placeholder="Location name"
            class="input text-sm"
          />
          <textarea
            bind:value={editDescription}
            placeholder="Description (optional)"
            class="input text-sm"
            rows="2"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary text-xs" onclick={cancelEdit}>
              Cancel
            </button>
            <button
              class="btn btn-primary text-xs"
              onclick={() =>
                story.currentLocation && saveEdit(story.currentLocation)}
              disabled={!editName.trim()}
            >
              Save
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if story.locations.length === 0}
    <p class="py-4 text-center text-sm text-surface-500">No locations yet</p>
  {:else}
    <div class="space-y-2">
      {#each story.locations.filter((l) => !l.current) as location (location.id)}
        {@const isCollapsed = ui.isEntityCollapsed(location.id)}
        {@const sectionLineCount = getSectionLineCount(location)}
        {@const needsCollapse = sectionLineCount > 4}
        <div class="card p-3">
          <!-- Section 1: Status and Name -->
          <button
            class="flex items-center gap-2 {location.visited
              ? 'text-surface-500 hover:text-surface-300'
              : 'text-surface-600 hover:text-surface-400'}"
            onclick={() => toggleVisited(location.id)}
            title={location.visited
              ? "Click to mark as unvisited"
              : "Click to mark as visited"}
          >
            <MapPin class="h-4 w-4" />
            <span class="text-sm font-medium"
              >{location.visited ? "Visited" : "Unvisited"}</span
            >
          </button>
          <h4 class="mt-1 break-words font-medium text-surface-100">
            {location.translatedName ?? location.name}
          </h4>

          <!-- Section 2: Description -->
          {#if location.description || location.translatedDescription}
            <div
              class="mt-1 space-y-2 rounded-md bg-surface-800/40"
              class:max-h-24={isCollapsed && needsCollapse}
              class:overflow-hidden={isCollapsed && needsCollapse}
            >
              <p class="break-words text-sm text-surface-400">
                {location.translatedDescription ?? location.description}
              </p>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div class="flex items-center justify-between gap-1 mt-3">
            <div class="flex items-center gap-3">
              {#if confirmingDeleteId === location.id}
                <button
                  class="sm:btn-ghost rounded text-xs text-red-400 hover:bg-red-500/20"
                  onclick={() => deleteLocation(location.id)}
                >
                  Confirm
                </button>
                <button
                  class="sm:btn-ghost rounded text-xs"
                  onclick={() => (confirmingDeleteId = null)}
                >
                  Cancel
                </button>
              {:else}
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                  onclick={() => startEdit(location)}
                  title="Edit location"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                  onclick={() => (confirmingDeleteId = location.id)}
                  title="Delete location"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              {/if}
            </div>
            <div class="flex items-center gap-1">
              {#if needsCollapse}
                <button
                  class="sm:btn-ghost rounded p-1.5 text-surface-500 hover:text-surface-200 sm:p-1"
                  onclick={() => toggleCollapse(location.id)}
                  title={isCollapsed ? "Expand" : "Collapse"}
                >
                  {#if isCollapsed}
                    <ChevronDown class="h-3.5 w-3.5" />
                  {:else}
                    <ChevronUp class="h-3.5 w-3.5" />
                  {/if}
                </button>
              {/if}
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs text-accent-400 hover:text-accent-300"
                onclick={() => goToLocation(location.id)}
              >
                Go
              </button>
            </div>
          </div>
          {#if editingId === location.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editName}
                placeholder="Location name"
                class="input text-sm"
              />
              <textarea
                bind:value={editDescription}
                placeholder="Description (optional)"
                class="input text-sm"
                rows="2"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary text-xs" onclick={cancelEdit}>
                  Cancel
                </button>
                <button
                  class="btn btn-primary text-xs"
                  onclick={() => saveEdit(location)}
                  disabled={!editName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
