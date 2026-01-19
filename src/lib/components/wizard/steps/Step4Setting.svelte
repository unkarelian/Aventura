<script lang="ts">
  import {
    Upload,
    Archive,
    Loader2,
    Check,
    Sparkles,
    X,
    PenTool,
    Wand2,
    Rocket,
    Search,
    Skull,
    Heart,
    Building,
  } from "lucide-svelte";
  import VaultScenarioPicker from "$lib/components/vault/VaultScenarioPicker.svelte";
  import type { VaultScenario } from "$lib/types";
  import type { ExpandedSetting, GeneratedCharacter } from "../wizardTypes";
  import { QUICK_START_SEEDS } from "$lib/services/templates";

  interface Props {
    settingSeed: string;
    expandedSetting: ExpandedSetting | null;
    settingElaborationGuidance: string;
    isExpandingSetting: boolean;
    settingError: string | null;
    isEditingSetting: boolean;
    selectedScenarioId: string | null;
    importedCardNpcs: GeneratedCharacter[];
    cardImportError: string | null;
    isImportingCard: boolean;
    savedScenarioToVaultConfirm: boolean;
    showScenarioVaultPicker: boolean;
    onSettingSeedChange: (value: string) => void;
    onGuidanceChange: (value: string) => void;
    onUseAsIs: () => void;
    onExpandSetting: () => void;
    onExpandFurther: () => void;
    onEditSetting: () => void;
    onCancelEdit: () => void;
    onSelectScenario: (id: string) => void;
    onCardImport: (event: Event) => void;
    onClearCardImport: () => void;
    onSaveToVault: () => void;
    onShowVaultPickerChange: (show: boolean) => void;
    onSelectFromVault: (scenario: VaultScenario) => void;
    cardImportFileInputRef: (el: HTMLInputElement | null) => void;
    scenarioCarouselRef: (el: HTMLDivElement | null) => void;
    onCarouselScroll: () => void;
  }

  let {
    settingSeed,
    expandedSetting,
    settingElaborationGuidance,
    isExpandingSetting,
    settingError,
    isEditingSetting,
    selectedScenarioId,
    importedCardNpcs,
    cardImportError,
    isImportingCard,
    savedScenarioToVaultConfirm,
    showScenarioVaultPicker,
    onSettingSeedChange,
    onGuidanceChange,
    onUseAsIs,
    onExpandSetting,
    onExpandFurther,
    onEditSetting,
    onCancelEdit,
    onSelectScenario,
    onCardImport,
    onClearCardImport,
    onSaveToVault,
    onShowVaultPickerChange,
    onSelectFromVault,
    cardImportFileInputRef,
    scenarioCarouselRef,
    onCarouselScroll,
  }: Props = $props();

  const templateIcons: Record<string, typeof Wand2> = {
    "fantasy-adventure": Wand2,
    "scifi-exploration": Rocket,
    "mystery-investigation": Search,
    "horror-survival": Skull,
    "slice-of-life": Heart,
    "historical-drama": Building,
  };

  // Check if setting seed contains {{user}} placeholder
  const hasUserPlaceholder = $derived(settingSeed.includes("{{user}}"));
</script>

<div class="space-y-4 overflow-x-hidden">
  <!-- Vault Picker Modal -->
  {#if showScenarioVaultPicker}
    <VaultScenarioPicker
      onSelect={onSelectFromVault}
      onClose={() => onShowVaultPickerChange(false)}
    />
  {/if}

  <!-- Starter Scenarios -->
  <div>
    <p class="text-xs text-surface-500 mb-2">
      Tap a starter scenario or write your own below
    </p>

    <!-- Desktop Grid (3 columns) -->
    <div class="hidden sm:grid sm:gap-2 sm:grid-cols-3">
      {#each QUICK_START_SEEDS as seed (seed.id)}
        {@const Icon = templateIcons[seed.id] ?? Sparkles}
        <button
          onclick={() => onSelectScenario(seed.id)}
          class="card flex items-center gap-2 px-3 py-2 text-left transition-all hover:border-accent-500/50 hover:bg-surface-700/50 {selectedScenarioId ===
          seed.id
            ? 'border-accent-500 bg-accent-500/10'
            : ''}"
        >
          <Icon class="h-4 w-4 text-accent-400 shrink-0" />
          <span class="font-medium text-surface-100 text-sm truncate"
            >{seed.name}</span
          >
        </button>
      {/each}
    </div>

    <!-- Mobile Carousel (infinite scroll, centered on first item) -->
    <div class="sm:hidden relative">
      <!-- Fade edges -->
      <div
        class="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-surface-800 to-transparent z-10"
      ></div>
      <div
        class="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-surface-800 to-transparent z-10"
      ></div>

      <!-- Scrollable container with tripled items for infinite effect -->
      <div
        use:scenarioCarouselRef
        onscroll={onCarouselScroll}
        class="flex gap-2 overflow-x-auto py-1 scrollbar-hide"
      >
        <!-- First copy (for seamless loop) -->
        {#each QUICK_START_SEEDS as seed (seed.id + "-pre")}
          {@const Icon = templateIcons[seed.id] ?? Sparkles}
          <button
            onclick={() => onSelectScenario(seed.id)}
            class="card flex items-center gap-2 px-3 py-2 text-left transition-all hover:border-accent-500/50 hover:bg-surface-700/50 shrink-0 {selectedScenarioId ===
            seed.id
              ? 'border-accent-500 bg-accent-500/10'
              : ''}"
          >
            <Icon class="h-4 w-4 text-accent-400 shrink-0" />
            <span
              class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
        <!-- Original items (middle set) -->
        {#each QUICK_START_SEEDS as seed (seed.id)}
          {@const Icon = templateIcons[seed.id] ?? Sparkles}
          <button
            onclick={() => onSelectScenario(seed.id)}
            class="card flex items-center gap-2 px-3 py-2 text-left transition-all hover:border-accent-500/50 hover:bg-surface-700/50 shrink-0 {selectedScenarioId ===
            seed.id
              ? 'border-accent-500 bg-accent-500/10'
              : ''}"
          >
            <Icon class="h-4 w-4 text-accent-400 shrink-0" />
            <span
              class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
        <!-- Last copy (for seamless loop) -->
        {#each QUICK_START_SEEDS as seed (seed.id + "-post")}
          {@const Icon = templateIcons[seed.id] ?? Sparkles}
          <button
            onclick={() => onSelectScenario(seed.id)}
            class="card flex items-center gap-2 px-3 py-2 text-left transition-all hover:border-accent-500/50 hover:bg-surface-700/50 shrink-0 {selectedScenarioId ===
            seed.id
              ? 'border-accent-500 bg-accent-500/10'
              : ''}"
          >
            <Icon class="h-4 w-4 text-accent-400 shrink-0" />
            <span
              class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </div>

  <p class="text-surface-400">
    Describe your world in a few sentences. The AI will expand it into a
    rich setting.
  </p>

  <!-- Import Options Row -->
  <div class="flex gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
    <!-- Import Character Card -->
    <button
      class="flex-1 sm:flex-none card bg-surface-900 border-dashed border-2 border-surface-600 p-2 sm:p-4 text-center hover:border-accent-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[70px] sm:min-h-[100px]"
      onclick={() => {
        const input = document.querySelector('input[type="file"][data-card-input]') as HTMLInputElement;
        input?.click();
      }}
    >
      <input
        type="file"
        accept=".json,.png"
        class="hidden"
        data-card-input
        use:cardImportFileInputRef
        onchange={onCardImport}
      />
      {#if isImportingCard}
        <Loader2
          class="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-surface-500 animate-spin"
        />
        <p class="text-surface-300 text-xs sm:text-sm font-medium">
          Converting...
        </p>
      {:else}
        <Upload
          class="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-surface-500"
        />
        <p class="text-surface-300 text-xs sm:text-sm font-medium">
          Import Card
        </p>
        <p
          class="text-[10px] sm:text-xs text-surface-500 hidden sm:block"
        >
          JSON or PNG
        </p>
      {/if}
    </button>

    <!-- Load from Vault -->
    <button
      class="flex-1 sm:flex-none card bg-surface-900 border-dashed border-2 border-surface-600 p-2 sm:p-4 text-center hover:border-accent-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[70px] sm:min-h-[100px]"
      onclick={() => onShowVaultPickerChange(true)}
    >
      <Archive
        class="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-surface-500"
      />
      <p class="text-surface-300 text-xs sm:text-sm font-medium">
        Load Vault
      </p>
      <p
        class="text-[10px] sm:text-xs text-surface-500 hidden sm:block"
      >
        Saved scenarios
      </p>
    </button>

    <!-- Save to Vault (always visible, disabled when no content) -->
    <button
      class="flex-1 sm:flex-none card bg-surface-900 border-dashed border-2 border-surface-600 p-2 sm:p-4 text-center transition-colors flex flex-col items-center justify-center min-h-[70px] sm:min-h-[100px] {savedScenarioToVaultConfirm
        ? 'border-green-500/50 bg-green-500/10'
        : ''} {settingSeed.trim()
        ? 'hover:border-green-500/50 cursor-pointer'
        : 'opacity-50 cursor-not-allowed'}"
      onclick={onSaveToVault}
      disabled={!settingSeed.trim() || savedScenarioToVaultConfirm}
    >
      {#if savedScenarioToVaultConfirm}
        <Check
          class="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-green-400"
        />
        <p class="text-green-300 text-xs sm:text-sm font-medium">
          Saved!
        </p>
      {:else}
        <Archive
          class="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-surface-500"
        />
        <p class="text-surface-300 text-xs sm:text-sm font-medium">
          Save Vault
        </p>
        <p
          class="text-[10px] sm:text-xs text-surface-500 hidden sm:block"
        >
          For later use
        </p>
      {/if}
    </button>
  </div>

  <!-- Import Status / Error -->
  {#if importedCardNpcs.length > 0}
    <div
      class="flex items-center justify-between bg-surface-800/50 p-2 rounded text-xs"
    >
      <span class="text-green-400 flex items-center gap-1">
        <Check class="h-3 w-3" />
        Imported: {importedCardNpcs.map((n) => n.name).join(", ")}
      </span>
      <button
        class="text-surface-400 hover:text-surface-200"
        onclick={onClearCardImport}
      >
        Clear
      </button>
    </div>
  {/if}
  {#if cardImportError}
    <p class="text-xs text-red-400 text-center">{cardImportError}</p>
  {/if}

  <div>
    <label class="mb-2 block text-sm font-medium text-surface-300">
      Setting Seed
    </label>
    <textarea
      value={settingSeed}
      oninput={(e) => onSettingSeedChange(e.currentTarget.value)}
      placeholder="e.g., A kingdom where music is magic, and bards are the most powerful beings. An ancient evil stirs in the Silent Lands, where no song has been heard for a thousand years..."
      class="input min-h-[100px] resize-none"
      rows="4"
    ></textarea>
    {#if hasUserPlaceholder}
      <p class="text-xs text-surface-500 mt-1 flex items-center gap-1">
        <span
          class="inline-flex items-center px-1 py-0.5 rounded bg-primary-600/30 text-primary-300 text-[10px] font-mono border border-primary-500/40"
          >{"{{user}}"}</span
        >
        will be replaced with your character's name from Step 5
      </p>
    {/if}
  </div>

  <!-- Elaboration Guidance (visible before expansion) -->
  {#if !expandedSetting}
    <div>
      <label class="mb-1 block text-xs font-medium text-surface-400">
        Elaboration guidance (optional)
      </label>
      <textarea
        value={settingElaborationGuidance}
        oninput={(e) => onGuidanceChange(e.currentTarget.value)}
        placeholder="e.g., Focus on dark gothic atmosphere, add steampunk elements, make the magic system more complex..."
        class="input min-h-[60px] resize-none text-sm"
        rows="2"
      ></textarea>
    </div>
  {/if}

  {#if !expandedSetting}
    <div class="flex flex-wrap gap-2">
      <button
        class="btn btn-secondary flex items-center gap-2"
        onclick={onUseAsIs}
        disabled={!settingSeed.trim()}
      >
        <Check class="h-4 w-4" />
        Use As-Is
      </button>
      <button
        class="btn btn-primary flex items-center gap-2"
        onclick={onExpandSetting}
        disabled={isExpandingSetting || !settingSeed.trim()}
      >
        {#if isExpandingSetting}
          <Loader2 class="h-4 w-4 animate-spin" />
          Expanding...
        {:else}
          <Sparkles class="h-4 w-4" />
          Expand with AI
        {/if}
      </button>
      {#if isEditingSetting}
        <button
          class="btn btn-secondary flex items-center gap-2"
          onclick={onCancelEdit}
          title="Restore the previous expanded setting"
        >
          <X class="h-4 w-4" />
          Cancel Edit
        </button>
      {/if}
    </div>
  {/if}

  {#if settingError}
    <p class="text-sm text-red-400">{settingError}</p>
  {/if}

  {#if expandedSetting}
    <div
      class="card bg-surface-900 px-4 py-3 sm:pt-3 sm:pb-3 space-y-2 sm:space-y-1"
    >
      <div class="flex gap-3 sm:mb-2">
        <p class="text-sm">Selected Setting</p>
        <div class="flex-1"></div>
        <button
          class="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
          onclick={onEditSetting}
          title="Edit the expanded description"
        >
          <PenTool class="h-3 w-3" />
          <span>Edit</span>
        </button>
        <button
          class="flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
          onclick={onExpandFurther}
          disabled={isExpandingSetting}
          title="Refine using the current setting details"
        >
          <Sparkles
            class="h-3 w-3 {isExpandingSetting ? 'animate-pulse' : ''}"
          />
          <span>{isExpandingSetting ? "Refining..." : "Refine"}</span>
        </button>
      </div>
      <p class="text-sm text-surface-300 whitespace-pre-wrap">
        {expandedSetting.description}
      </p>

      {#if expandedSetting.keyLocations.length > 0}
        <div>
          <h4
            class="text-xs font-medium text-surface-400 uppercase mb-1"
          >
            Key Locations
          </h4>
          <ul class="text-sm text-surface-300 space-y-1">
            {#each expandedSetting.keyLocations as location}
              <li>
                <strong>{location.name}:</strong>
                {location.description}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="flex flex-wrap gap-2">
        {#each expandedSetting.themes as theme}
          <span
            class="px-2 py-0.5 rounded-full bg-surface-700 text-xs text-surface-300"
            >{theme}</span
          >
        {/each}
      </div>

      <!-- Guidance field for iterative refinement -->
      <div class="pt-2 border-t border-surface-700">
        <label class="mb-1 block text-xs font-medium text-surface-400">
          Refinement guidance (optional)
        </label>
        <textarea
          value={settingElaborationGuidance}
          oninput={(e) => onGuidanceChange(e.currentTarget.value)}
          placeholder="e.g., Add more detail about the magic system, make the atmosphere darker..."
          class="input min-h-[50px] resize-none text-sm"
          rows="2"
        ></textarea>
      </div>
    </div>
  {/if}
</div>
