<script lang="ts">
  import {
    Sparkles,
    ImageIcon,
  } from "lucide-svelte";
  import type { POV, Tense, POVOption } from "../wizardTypes";
  import { tonePresets, tenseOptions } from "../wizardTypes";

  interface Props {
    selectedPOV: POV;
    selectedTense: Tense;
    tone: string;
    visualProseMode: boolean;
    inlineImageMode: boolean;
    
    // Handlers
    onPOVChange: (pov: POV) => void;
    onTenseChange: (tense: Tense) => void;
    onToneChange: (tone: string) => void;
    onVisualProseModeChange: (enabled: boolean) => void;
    onInlineImageModeChange: (enabled: boolean) => void;
  }

  let {
    selectedPOV,
    selectedTense,
    tone,
    visualProseMode,
    inlineImageMode,
    onPOVChange,
    onTenseChange,
    onToneChange,
    onVisualProseModeChange,
    onInlineImageModeChange,
  }: Props = $props();

  // POV options
  const povOptions: POVOption[] = [
    {
      id: "first",
      label: "1st Person",
      example: "I walk into the room...",
    },
    {
      id: "second",
      label: "2nd Person",
      example: "You walk into the room...",
    },
    {
      id: "third",
      label: "3rd Person",
      example: "They walk into the room...",
    },
  ];
</script>

<div class="space-y-4">
  <p class="text-surface-400">
    Customize how your story will be written.
  </p>

  <!-- POV Selection -->
  <div>
    <label class="mb-2 block text-sm font-medium text-surface-300"
      >Point of View</label
    >
    <div class="grid gap-2 grid-cols-3">
      {#each povOptions as option}
        <button
          class="card p-3 text-center transition-all"
          class:ring-2={selectedPOV === option.id}
          class:ring-accent-500={selectedPOV === option.id}
          onclick={() => onPOVChange(option.id)}
        >
          <span class="block font-medium text-surface-100"
            >{option.label}</span
          >
          <span class="text-xs text-surface-400">{option.example}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Tense Selection -->
  <div>
    <label class="mb-2 block text-sm font-medium text-surface-300"
      >Tense</label
    >
    <div class="grid grid-cols-2 gap-2">
      {#each tenseOptions as option}
        <button
          class="card p-3 text-center transition-all"
          class:ring-2={selectedTense === option.id}
          class:ring-accent-500={selectedTense === option.id}
          onclick={() => onTenseChange(option.id)}
        >
          <span class="block font-medium text-surface-100"
            >{option.label}</span
          >
          <span class="text-xs text-surface-400">{option.example}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Tone Selection -->
  <div>
    <label class="mb-2 block text-sm font-medium text-surface-300"
      >Tone</label
    >
    <div class="flex flex-wrap gap-2 mb-2">
      {#each tonePresets as preset}
        <button
          class="px-3 py-1 rounded-full text-sm transition-colors"
          class:bg-accent-500={tone === preset}
          class:text-white={tone === preset}
          class:bg-surface-700={tone !== preset}
          class:text-surface-300={tone !== preset}
          class:hover:bg-surface-600={tone !== preset}
          onclick={() => onToneChange(preset)}
        >
          {preset}
        </button>
      {/each}
    </div>
    <input
      type="text"
      value={tone}
      oninput={(e) => onToneChange(e.currentTarget.value)}
      placeholder="Or describe your own tone..."
      class="input"
    />
  </div>

  <!-- Visual Prose Mode Toggle -->
  <div class="card bg-surface-800/50 p-4">
    <div class="flex items-start gap-3">
      <div class="rounded-full bg-surface-700 p-2">
        <Sparkles class="h-5 w-5 text-accent-400" />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-surface-200">
            Visual Prose Mode
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-800"
            class:bg-accent-600={visualProseMode}
            class:bg-surface-600={!visualProseMode}
            onclick={() => onVisualProseModeChange(!visualProseMode)}
            role="switch"
            aria-checked={visualProseMode}
            aria-label="Toggle Visual Prose Mode"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              class:translate-x-5={visualProseMode}
              class:translate-x-0={!visualProseMode}
            ></span>
          </button>
        </div>
        <p class="mt-1 text-xs text-surface-400">
          Enable rich HTML/CSS visual output. The AI can create styled
          layouts, dialogue boxes, and atmospheric effects. Best for
          immersive, cinematic storytelling.
        </p>
      </div>
    </div>
  </div>

  <!-- Inline Image Mode Toggle -->
  <div class="card bg-surface-800/50 p-4">
    <div class="flex items-start gap-3">
      <div class="rounded-full bg-surface-700 p-2">
        <ImageIcon class="h-5 w-5 text-blue-400" />
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-surface-200">
            Inline Image Mode
          </div>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-800"
            class:bg-accent-600={inlineImageMode}
            class:bg-surface-600={!inlineImageMode}
            onclick={() => onInlineImageModeChange(!inlineImageMode)}
            role="switch"
            aria-checked={inlineImageMode}
            aria-label="Toggle Inline Image Mode"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              class:translate-x-5={inlineImageMode}
              class:translate-x-0={!inlineImageMode}
            ></span>
          </button>
        </div>
        <p class="mt-1 text-xs text-surface-400">
          AI places image tags directly in the narrative. Images are
          generated inline where the AI decides they fit best. Requires
          image generation to be configured.
        </p>
      </div>
    </div>
  </div>
</div>
