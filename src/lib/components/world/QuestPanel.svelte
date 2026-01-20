<script lang="ts">
  import { story } from "$lib/stores/story.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import {
    Plus,
    Target,
    CheckCircle,
    XCircle,
    Circle,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronUp,
  } from "lucide-svelte";
  import type { StoryBeat } from "$lib/types";

  let showAddForm = $state(false);
  let newTitle = $state("");
  let newDescription = $state("");
  let newType = $state<StoryBeat["type"]>("quest");
  let editingId = $state<string | null>(null);
  let editTitle = $state("");
  let editDescription = $state("");
  let editType = $state<StoryBeat["type"]>("quest");
  let editStatus = $state<StoryBeat["status"]>("pending");
  let confirmingDeleteId = $state<string | null>(null);

  function toggleCollapse(beatId: string) {
    const isCollapsed = ui.isEntityCollapsed(beatId);
    ui.toggleEntityCollapsed(beatId, !isCollapsed);
  }

  function getSectionLineCount(beat: StoryBeat): number {
    let lines = 0;
    if (beat.description) {
      const words = beat.description.split(/\s+/).length;
      lines += Math.ceil(words / 8);
    }
    return lines;
  }

  async function addBeat() {
    if (!newTitle.trim()) return;
    await story.addStoryBeat(
      newTitle.trim(),
      newType,
      newDescription.trim() || undefined,
    );
    newTitle = "";
    newDescription = "";
    newType = "quest";
    showAddForm = false;
  }

  function startEdit(beat: StoryBeat) {
    editingId = beat.id;
    editTitle = beat.title;
    editDescription = beat.description ?? "";
    editType = beat.type;
    editStatus = beat.status;
  }

  function cancelEdit() {
    editingId = null;
    editTitle = "";
    editDescription = "";
    editType = "quest";
    editStatus = "pending";
  }

  async function saveEdit(beat: StoryBeat) {
    const title = editTitle.trim();
    if (!title) return;
    await story.updateStoryBeat(beat.id, {
      title,
      description: editDescription.trim() || null,
      type: editType,
      status: editStatus,
    });
    cancelEdit();
  }

  async function deleteBeat(beat: StoryBeat) {
    await story.deleteStoryBeat(beat.id);
    confirmingDeleteId = null;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pending":
        return Circle;
      case "active":
        return Target;
      case "completed":
        return CheckCircle;
      case "failed":
        return XCircle;
      default:
        return Circle;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "text-surface-500";
      case "active":
        return "text-amber-400";
      case "completed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-surface-400";
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case "milestone":
        return "Milestone";
      case "quest":
        return "Quest";
      case "revelation":
        return "Revelation";
      case "event":
        return "Event";
      case "plot_point":
        return "Plot Point";
      default:
        return type;
    }
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="font-medium text-surface-200">Story Beats</h3>
    <button
      class="sm:btn-ghost rounded p-1"
      onclick={() => (showAddForm = !showAddForm)}
      title="Add story beat"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>

  {#if showAddForm}
    <div class="card space-y-2">
      <input
        type="text"
        bind:value={newTitle}
        placeholder="Title"
        class="input text-sm"
      />
      <select bind:value={newType} class="input text-sm">
        <option value="quest">Quest</option>
        <option value="milestone">Milestone</option>
        <option value="revelation">Revelation</option>
        <option value="event">Event</option>
        <option value="plot_point">Plot Point</option>
      </select>
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
          onclick={addBeat}
          disabled={!newTitle.trim()}
        >
          Add
        </button>
      </div>
    </div>
  {/if}

  <!-- Active quests -->
  {#if story.pendingQuests.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-surface-400">Active</h4>
      {#each story.pendingQuests as beat (beat.id)}
        {@const StatusIcon = getStatusIcon(beat.status)}
        {@const isCollapsed = ui.isEntityCollapsed(beat.id)}
        {@const sectionLineCount = getSectionLineCount(beat)}
        {@const needsCollapse = sectionLineCount > 4}
        <div class="card p-3">
          <!-- Section 1: Icon, Title, and Type -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div class="flex min-w-0 items-start gap-2 flex-1">
              <div class="{getStatusColor(beat.status)} flex-shrink-0">
                <StatusIcon class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="break-words font-medium text-surface-100"
                    >{beat.translatedTitle ?? beat.title}</span
                  >
                  <span
                    class="rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400"
                  >
                    {getTypeLabel(beat.type)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Description -->
          {#if beat.description || beat.translatedDescription}
            <div
              class="mt-2 space-y-2 rounded-md bg-surface-800/40"
              class:max-h-24={isCollapsed && needsCollapse}
              class:overflow-hidden={isCollapsed && needsCollapse}
            >
              <p class="break-words text-sm text-surface-400">
                {beat.translatedDescription ?? beat.description}
              </p>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div
            class="flex items-center justify-between gap-1 self-end sm:self-auto mt-3"
          >
            <div class="flex items-center gap-3">
              {#if confirmingDeleteId === beat.id}
                <button
                  class="sm:btn-ghost rounded text-xs text-red-400 hover:bg-red-500/20"
                  onclick={() => deleteBeat(beat)}
                >
                  Confirm
                </button>
                <button
                  class="sm:btn-ghost roundedtext-xs"
                  onclick={() => (confirmingDeleteId = null)}
                >
                  Cancel
                </button>
              {:else}
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                  onclick={() => startEdit(beat)}
                  title="Edit story beat"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                  onclick={() => (confirmingDeleteId = beat.id)}
                  title="Delete story beat"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              {/if}
            </div>
            {#if needsCollapse}
              <button
                class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                onclick={() => toggleCollapse(beat.id)}
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
          {#if editingId === beat.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editTitle}
                placeholder="Title"
                class="input text-sm"
              />
              <select bind:value={editType} class="input text-sm">
                <option value="quest">Quest</option>
                <option value="milestone">Milestone</option>
                <option value="revelation">Revelation</option>
                <option value="event">Event</option>
                <option value="plot_point">Plot Point</option>
              </select>
              <select bind:value={editStatus} class="input text-sm">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
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
                  onclick={() => saveEdit(beat)}
                  disabled={!editTitle.trim()}
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

  {#if story.storyBeats.length === 0}
    <p class="py-4 text-center text-sm text-surface-500">No story beats yet</p>
  {:else}
    <!-- Completed/Failed -->
    {@const completedBeats = story.storyBeats.filter(
      (b) => b.status === "completed" || b.status === "failed",
    )}
    {#if completedBeats.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-surface-400">History</h4>
        {#each completedBeats as beat (beat.id)}
          {@const StatusIcon = getStatusIcon(beat.status)}
          {@const isCollapsed = ui.isEntityCollapsed(beat.id)}
          {@const sectionLineCount = getSectionLineCount(beat)}
          {@const needsCollapse = sectionLineCount > 4}
          <div class="card p-3 opacity-60">
            <!-- Section 1: Icon and Title -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div class="flex min-w-0 items-start gap-2 flex-1">
                <div class="{getStatusColor(beat.status)} flex-shrink-0">
                  <StatusIcon class="h-4 w-4" />
                </div>
                <span class="break-words text-surface-300">{beat.translatedTitle ?? beat.title}</span>
              </div>
            </div>

            <!-- Section 2: Description -->
            {#if beat.description || beat.translatedDescription}
              <div
                class="mt-2 space-y-2 rounded-md bg-surface-800/40"
                class:max-h-24={isCollapsed && needsCollapse}
                class:overflow-hidden={isCollapsed && needsCollapse}
              >
                <p class="break-words text-sm text-surface-400">
                  {beat.translatedDescription ?? beat.description}
                </p>
              </div>
            {/if}

            <!-- Action Buttons -->
            <div
              class="flex items-center justify-between gap-1 self-end sm:self-auto mt-3"
            >
              <div class="flex items-center gap-3">
                {#if confirmingDeleteId === beat.id}
                  <button
                    class="sm:btn-ghost rounded text-xs text-red-400 hover:bg-red-500/20"
                    onclick={() => deleteBeat(beat)}
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
                    onclick={() => startEdit(beat)}
                    title="Edit story beat"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    class="sm:btn-ghost rounded text-surface-500 hover:text-red-400"
                    onclick={() => (confirmingDeleteId = beat.id)}
                    title="Delete story beat"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                {/if}
              </div>
              {#if needsCollapse}
                <button
                  class="sm:btn-ghost rounded text-surface-500 hover:text-surface-200"
                  onclick={() => toggleCollapse(beat.id)}
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
            {#if editingId === beat.id}
              <div class="mt-3 space-y-2">
                <input
                  type="text"
                  bind:value={editTitle}
                  placeholder="Title"
                  class="input text-sm"
                />
                <select bind:value={editType} class="input text-sm">
                  <option value="quest">Quest</option>
                  <option value="milestone">Milestone</option>
                  <option value="revelation">Revelation</option>
                  <option value="event">Event</option>
                  <option value="plot_point">Plot Point</option>
                </select>
                <select bind:value={editStatus} class="input text-sm">
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
                <textarea
                  bind:value={editDescription}
                  placeholder="Description (optional)"
                  class="input text-sm"
                  rows="2"
                ></textarea>
                <div class="flex justify-end gap-2">
                  <button
                    class="btn btn-secondary text-xs"
                    onclick={cancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-primary text-xs"
                    onclick={() => saveEdit(beat)}
                    disabled={!editTitle.trim()}
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
  {/if}
</div>
