<script lang="ts">
  import { story } from "$lib/stores/story.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import {
    Plus,
    Package,
    Shield,
    Pencil,
    Trash2,
    ArrowUp,
    MapPin,
    ChevronDown,
    ChevronUp,
  } from "lucide-svelte";
  import type { Item } from "$lib/types";

  let showAddForm = $state(false);
  let newName = $state("");
  let newDescription = $state("");
  let newQuantity = $state(1);
  let editingId = $state<string | null>(null);
  let editName = $state("");
  let editDescription = $state("");
  let editQuantity = $state(1);
  let editEquipped = $state(false);
  let confirmingDeleteId = $state<string | null>(null);
  let droppingItemId = $state<string | null>(null);
  let dropLocationId = $state<string>("");

  const worldItems = $derived(
    story.items.filter((item) => item.location !== "inventory"),
  );

  function toggleCollapse(itemId: string) {
    const isCollapsed = ui.isEntityCollapsed(itemId);
    ui.toggleEntityCollapsed(itemId, !isCollapsed);
  }

  function getSectionLineCount(item: Item): number {
    let lines = 0;
    if (item.description) {
      const words = item.description.split(/\s+/).length;
      lines += Math.ceil(words / 8);
    }
    return lines;
  }

  async function addItem() {
    if (!newName.trim()) return;
    await story.addItem(
      newName.trim(),
      newDescription.trim() || undefined,
      newQuantity,
    );
    newName = "";
    newDescription = "";
    newQuantity = 1;
    showAddForm = false;
  }

  function startEdit(item: Item) {
    editingId = item.id;
    editName = item.name;
    editDescription = item.description ?? "";
    editQuantity = item.quantity;
    editEquipped = item.equipped;
  }

  function cancelEdit() {
    editingId = null;
    editName = "";
    editDescription = "";
    editQuantity = 1;
    editEquipped = false;
  }

  async function saveEdit(item: Item) {
    const name = editName.trim();
    if (!name) return;

    const quantity = Math.max(1, Number(editQuantity) || 1);
    await story.updateItem(item.id, {
      name,
      description: editDescription.trim() || null,
      quantity,
      equipped: item.location === "inventory" ? editEquipped : false,
    });

    cancelEdit();
  }

  async function deleteItem(item: Item) {
    await story.deleteItem(item.id);
    confirmingDeleteId = null;
  }

  function beginDrop(item: Item) {
    droppingItemId = item.id;
    const preferredLocation = story.locations.find(
      (loc) => loc.id === item.location,
    )?.id;
    dropLocationId =
      preferredLocation ||
      story.currentLocation?.id ||
      story.locations[0]?.id ||
      "";
  }

  function cancelDrop() {
    droppingItemId = null;
    dropLocationId = "";
  }

  async function dropItem(item: Item) {
    if (!dropLocationId) return;
    await story.updateItem(item.id, {
      location: dropLocationId,
      equipped: false,
    });
    cancelDrop();
  }

  async function pickUpItem(item: Item) {
    await story.updateItem(item.id, {
      location: "inventory",
    });
  }

  async function moveItem(item: Item) {
    if (!dropLocationId) return;
    await story.updateItem(item.id, {
      location: dropLocationId,
    });
    cancelDrop();
  }

  function getLocationLabel(locationId: string) {
    if (locationId === "inventory") return "Inventory";
    const location = story.locations.find((loc) => loc.id === locationId);
    return location?.name || "Unknown location";
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="font-medium text-surface-200">Inventory</h3>
    <button
      class="sm:btn-ghost rounded p-1"
      onclick={() => (showAddForm = !showAddForm)}
      title="Add item"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>

  {#if showAddForm}
    <div class="card space-y-2">
      <input
        type="text"
        bind:value={newName}
        placeholder="Item name"
        class="input text-sm"
      />
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="number"
          bind:value={newQuantity}
          min="1"
          class="input w-20 text-sm"
        />
        <span class="self-center text-sm text-surface-400">quantity</span>
      </div>
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
          onclick={addItem}
          disabled={!newName.trim()}
        >
          Add
        </button>
      </div>
    </div>
  {/if}

  <!-- Equipped items -->
  {#if story.equippedItems.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-surface-400">Equipped</h4>
      {#each story.equippedItems as item (item.id)}
        {@const isCollapsed = ui.isEntityCollapsed(item.id)}
        {@const sectionLineCount = getSectionLineCount(item)}
        {@const needsCollapse = sectionLineCount > 4}
        <div class="card border-accent-500/30 bg-accent-500/5 p-3">
          <!-- Section 1: Icon, Name, and Quantity -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div class="flex min-w-0 items-start gap-2 flex-1">
              <Shield class="h-4 w-4 text-accent-400 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="break-words font-medium text-surface-100"
                    >{item.translatedName ?? item.name}</span
                  >
                  {#if item.quantity > 1}
                    <span class="text-sm text-surface-400"
                      >x{item.quantity}</span
                    >
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Description -->
          {#if item.description || item.translatedDescription}
            <div
              class="mt-2 space-y-2 rounded-md bg-surface-800/40"
              class:max-h-24={isCollapsed && needsCollapse}
              class:overflow-hidden={isCollapsed && needsCollapse}
            >
              <p class="break-words text-sm text-surface-400">
                {item.translatedDescription ?? item.description}
              </p>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div
            class="flex items-center justify-between gap-1 self-end sm:self-auto mt-3"
          >
            <div class="flex items-center gap-3">
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => startEdit(item)}
                title="Edit item"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                onclick={() => (confirmingDeleteId = item.id)}
                title="Remove item"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              {#if needsCollapse}
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                  onclick={() => toggleCollapse(item.id)}
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
                class="sm:btn-ghost ml-2 rounded text-xs text-accent-400 hover:text-accent-300"
                onclick={() => beginDrop(item)}
                title="Drop item"
              >
                Drop
              </button>
            </div>
          </div>
          {#if editingId === item.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editName}
                placeholder="Item name"
                class="input text-sm"
              />
              <div class="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  bind:value={editQuantity}
                  min="1"
                  class="input w-20 text-sm"
                />
                <label class="flex items-center gap-2 text-sm text-surface-400">
                  <input type="checkbox" bind:checked={editEquipped} />
                  Equipped
                </label>
              </div>
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
                  onclick={() => saveEdit(item)}
                  disabled={!editName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {/if}
          {#if droppingItemId === item.id}
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-sm text-surface-400">
                <MapPin class="h-3.5 w-3.5" />
                <span>Drop at</span>
              </div>
              <select
                bind:value={dropLocationId}
                class="input text-sm"
                disabled={story.locations.length === 0}
              >
                {#if story.locations.length === 0}
                  <option value="">No locations available</option>
                {:else}
                  {#each story.locations as location (location.id)}
                    <option value={location.id}>{location.name}</option>
                  {/each}
                {/if}
              </select>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary text-xs" onclick={cancelDrop}>
                  Cancel
                </button>
                <button
                  class="btn btn-primary text-xs"
                  onclick={() => dropItem(item)}
                  disabled={!dropLocationId}
                >
                  Drop
                </button>
              </div>
            </div>
          {/if}
          {#if confirmingDeleteId === item.id}
            <div class="mt-3 flex justify-end gap-2">
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                onclick={() => deleteItem(item)}
              >
                Confirm
              </button>
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs"
                onclick={() => (confirmingDeleteId = null)}
              >
                Cancel
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if story.inventoryItems.filter((item) => !item.equipped).length === 0 && story.equippedItems.length === 0}
    <p class="py-4 text-center text-sm text-surface-500">No items yet</p>
  {:else if story.inventoryItems.filter((item) => !item.equipped).length > 0}
    <div class="space-y-2">
      {#if story.equippedItems.length > 0}
        <h4 class="text-sm font-medium text-surface-400">Inventory</h4>
      {/if}
      {#each story.inventoryItems.filter((item) => !item.equipped) as item (item.id)}
        {@const isCollapsed = ui.isEntityCollapsed(item.id)}
        {@const sectionLineCount = getSectionLineCount(item)}
        {@const needsCollapse = sectionLineCount > 4}
        <div class="card p-3">
          <!-- Section 1: Icon, Name, and Quantity -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div class="flex min-w-0 items-start gap-2 flex-1">
              <div class="rounded-full bg-surface-700 p-1.5 flex-shrink-0">
                <Package class="h-4 w-4 text-surface-400" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="break-words font-medium text-surface-100"
                    >{item.translatedName ?? item.name}</span
                  >
                  {#if item.quantity > 1}
                    <span class="text-sm text-surface-400"
                      >x{item.quantity}</span
                    >
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Description -->
          {#if item.description || item.translatedDescription}
            <div
              class="mt-2 space-y-2 rounded-md bg-surface-800/40"
              class:max-h-24={isCollapsed && needsCollapse}
              class:overflow-hidden={isCollapsed && needsCollapse}
            >
              <p class="break-words text-sm text-surface-400">
                {item.translatedDescription ?? item.description}
              </p>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div
            class="flex items-center justify-between gap-1 self-end sm:self-auto mt-3"
          >
            <div class="flex items-center gap-3">
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => startEdit(item)}
                title="Edit item"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                onclick={() => (confirmingDeleteId = item.id)}
                title="Remove item"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              {#if needsCollapse}
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                  onclick={() => toggleCollapse(item.id)}
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
                class="sm:btn-ghost ml-2 rounded text-xs text-accent-400 hover:text-accent-300"
                onclick={() => beginDrop(item)}
                title="Drop item"
              >
                Drop
              </button>
            </div>
          </div>
          {#if editingId === item.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editName}
                placeholder="Item name"
                class="input text-sm"
              />
              <div class="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  bind:value={editQuantity}
                  min="1"
                  class="input w-20 text-sm"
                />
                <label class="flex items-center gap-2 text-sm text-surface-400">
                  <input type="checkbox" bind:checked={editEquipped} />
                  Equipped
                </label>
              </div>
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
                  onclick={() => saveEdit(item)}
                  disabled={!editName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {/if}
          {#if droppingItemId === item.id}
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-sm text-surface-400">
                <MapPin class="h-3.5 w-3.5" />
                <span>Drop at</span>
              </div>
              <select
                bind:value={dropLocationId}
                class="input text-sm"
                disabled={story.locations.length === 0}
              >
                {#if story.locations.length === 0}
                  <option value="">No locations available</option>
                {:else}
                  {#each story.locations as location (location.id)}
                    <option value={location.id}>{location.name}</option>
                  {/each}
                {/if}
              </select>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary text-xs" onclick={cancelDrop}>
                  Cancel
                </button>
                <button
                  class="btn btn-primary text-xs"
                  onclick={() => dropItem(item)}
                  disabled={!dropLocationId}
                >
                  Drop
                </button>
              </div>
            </div>
          {/if}
          {#if confirmingDeleteId === item.id}
            <div class="mt-3 flex justify-end gap-2">
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                onclick={() => deleteItem(item)}
              >
                Confirm
              </button>
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs"
                onclick={() => (confirmingDeleteId = null)}
              >
                Cancel
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if worldItems.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-surface-400">World Items</h4>
      {#each worldItems as item (item.id)}
        {@const isCollapsed = ui.isEntityCollapsed(item.id)}
        {@const sectionLineCount = getSectionLineCount(item)}
        {@const needsCollapse = sectionLineCount > 4}
        <div class="card p-3">
          <!-- Section 1: Icon, Name, Quantity, and Location -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div class="flex min-w-0 items-start gap-2 flex-1">
              <div class="rounded-full bg-surface-700 p-1.5 flex-shrink-0">
                <Package class="h-4 w-4 text-surface-400" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="break-words font-medium text-surface-100"
                    >{item.translatedName ?? item.name}</span
                  >
                  {#if item.quantity > 1}
                    <span class="text-sm text-surface-400"
                      >x{item.quantity}</span
                    >
                  {/if}
                </div>
                <p class="mt-1 break-words text-xs text-surface-500">
                  At {getLocationLabel(item.location)}
                </p>
              </div>
            </div>
          </div>

          <!-- Section 2: Description -->
          {#if item.description || item.translatedDescription}
            <div
              class="mt-2 space-y-2 rounded-md bg-surface-800/40"
              class:max-h-24={isCollapsed && needsCollapse}
              class:overflow-hidden={isCollapsed && needsCollapse}
            >
              <p class="break-words text-sm text-surface-400">
                {item.translatedDescription ?? item.description}
              </p>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div
            class="flex items-center justify-between gap-1 self-end sm:self-auto mt-3"
          >
            <div class="flex items-center gap-3">
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => startEdit(item)}
                title="Edit item"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => pickUpItem(item)}
                title="Pick up item"
              >
                <ArrowUp class="h-3.5 w-3.5" />
              </button>
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => beginDrop(item)}
                title="Move item"
              >
                <MapPin class="h-3.5 w-3.5" />
              </button>
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                onclick={() => (confirmingDeleteId = item.id)}
                title="Remove item"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            {#if needsCollapse}
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => toggleCollapse(item.id)}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {#if isCollapsed}
                  <ChevronDown class="h-3.5 w-3.5" />
                {:else}
                  <ChevronUp class="h-3.5 w-3.5" />
                {/if}
              </button>
            {/if}
          </div>
          {#if editingId === item.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editName}
                placeholder="Item name"
                class="input text-sm"
              />
              <div class="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  bind:value={editQuantity}
                  min="1"
                  class="input w-20 text-sm"
                />
                <label class="flex items-center gap-2 text-sm text-surface-400">
                  <input type="checkbox" bind:checked={editEquipped} disabled />
                  Equipped (inventory only)
                </label>
              </div>
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
                  onclick={() => saveEdit(item)}
                  disabled={!editName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {/if}
          {#if droppingItemId === item.id}
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-2 text-sm text-surface-400">
                <MapPin class="h-3.5 w-3.5" />
                <span>Move to</span>
              </div>
              <select
                bind:value={dropLocationId}
                class="input text-sm"
                disabled={story.locations.length === 0}
              >
                {#if story.locations.length === 0}
                  <option value="">No locations available</option>
                {:else}
                  {#each story.locations as location (location.id)}
                    <option value={location.id}>{location.name}</option>
                  {/each}
                {/if}
              </select>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary text-xs" onclick={cancelDrop}>
                  Cancel
                </button>
                <button
                  class="btn btn-primary text-xs"
                  onclick={() => moveItem(item)}
                  disabled={!dropLocationId}
                >
                  Move
                </button>
              </div>
            </div>
          {/if}
          {#if confirmingDeleteId === item.id}
            <div class="mt-3 flex justify-end gap-2">
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                onclick={() => deleteItem(item)}
              >
                Confirm
              </button>
              <button
                class="sm:btn-ghost rounded px-2 py-1 text-xs"
                onclick={() => (confirmingDeleteId = null)}
              >
                Cancel
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
