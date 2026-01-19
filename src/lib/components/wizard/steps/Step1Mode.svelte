<script lang="ts">
  import { Sword, Feather } from "lucide-svelte";
  import type { StoryMode } from "../wizardTypes";

  interface Props {
    selectedMode: StoryMode;
    onModeChange: (mode: StoryMode) => void;
  }

  let { selectedMode, onModeChange }: Props = $props();
</script>

<div class="space-y-4">
  <p class="text-surface-400">
    How do you want to experience your story?
  </p>
  <div class="grid gap-4 sm:grid-cols-2">
    <button
      class="card p-6 text-left transition-all hover:border-primary-500/50"
      class:ring-2={selectedMode === "adventure"}
      class:ring-primary-500={selectedMode === "adventure"}
      onclick={() => onModeChange("adventure")}
    >
      <div class="flex items-center gap-4 mb-3">
        <div class="rounded-lg bg-primary-900/50 p-3">
          <Sword class="h-6 w-6 text-primary-400" />
        </div>
        <span class="text-lg font-semibold text-surface-100"
          >Adventure Mode</span
        >
      </div>
      <p class="text-sm text-surface-400">
        <strong>You are the protagonist.</strong> Explore the world, interact
        with characters, and make choices that shape your story. The AI narrates
        the consequences of your actions.
      </p>
    </button>
    <button
      class="card p-6 text-left transition-all hover:border-secondary-500/50"
      class:ring-2={selectedMode === "creative-writing"}
      class:ring-secondary-500={selectedMode === "creative-writing"}
      onclick={() => onModeChange("creative-writing")}
    >
      <div class="flex items-center gap-4 mb-3">
        <div class="rounded-lg bg-secondary-900/50 p-3">
          <Feather class="h-6 w-6 text-secondary-400" />
        </div>
        <span class="text-lg font-semibold text-surface-100"
          >Creative Writing</span
        >
      </div>
      <p class="text-sm text-surface-400">
        <strong>You are the author.</strong> Direct the story and craft the
        narrative. The AI collaborates with you to write prose following
        your creative vision.
      </p>
    </button>
  </div>
</div>
