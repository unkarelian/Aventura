<script lang="ts">
  import { slide } from "svelte/transition";
  import {
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
    Archive,
    ChevronDown,
    Send,
  } from "lucide-svelte";
  import VaultScenarioBrowser from "$lib/components/vault/VaultScenarioBrowser.svelte";
  import { scenarioVault } from "$lib/stores/scenarioVault.svelte";
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
    onNavigateToVault?: () => void;
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
    onNavigateToVault,
  }: Props = $props();

  const templateIcons: Record<string, typeof Wand2> = {
    "fantasy-adventure": Wand2,
    "scifi-exploration": Rocket,
    "mystery-investigation": Search,
    "horror-survival": Skull,
    "slice-of-life": Heart,
    "historical-drama": Building,
  };

  const hasUserPlaceholder = $derived(settingSeed.includes("{{user}}"));
  const hasVaultScenarios = $derived(
    scenarioVault.isLoaded && scenarioVault.scenarios.length > 0,
  );
  let showExpandOptions = $state(false);
  let loadedVaultScenarioId = $state<string | null>(null);
  let editDescription = $state("");
  let isEditingDescription = $state(false);

  function handleSelectFromVault(scenario: VaultScenario) {
    loadedVaultScenarioId = scenario.id;
    onSelectFromVault(scenario);
  }

  function handleEditDescription() {
    editDescription = expandedSetting?.description ?? "";
    isEditingDescription = true;
  }

  function handleSaveDescription() {
    if (editDescription.trim()) {
      onSettingSeedChange(editDescription);
      onUseAsIs();
    }
    isEditingDescription = false;
  }

  function handleCancelDescriptionEdit() {
    editDescription = "";
    isEditingDescription = false;
  }
</script>

<div class="space-y-4">
  <!-- SECTION 1: Quick Start Templates & Custom -->
  <div class="space-y-2">
    <!-- <div class="flex items-center gap-2">
      <Sparkles class="h-4 w-4 text-accent-400" />
      <h3 class="text-sm font-medium text-surface-200">
        Quick Start Templates & Custom
      </h3>
    </div> -->
    <p class="text-surface-400 text-xs">
      Choose a template or write your own below.
    </p>

    <!-- Templates Grid -->
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

    <!-- Mobile Carousel -->
    <div class="sm:hidden relative">
      <div
        class="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-surface-800 to-transparent z-10"
      ></div>
      <div
        class="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-surface-800 to-transparent z-10"
      ></div>
      <div
        use:scenarioCarouselRef
        onscroll={onCarouselScroll}
        class="flex gap-2 overflow-x-auto py-1 scrollbar-hide"
      >
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
            <span class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
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
            <span class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
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
            <span class="font-medium text-surface-100 text-sm whitespace-nowrap"
              >{seed.name}</span
            >
          </button>
        {/each}
      </div>
    </div>

    <!-- Custom Setting Input -->
    <div class="space-y-2">
      <textarea
        value={settingSeed}
        oninput={(e) => onSettingSeedChange(e.currentTarget.value)}
        placeholder="Describe your world... (e.g., A kingdom where music is magic)"
        class="input min-h-[80px] resize-none"
        rows="3"
      ></textarea>

      {#if hasUserPlaceholder}
        <p class="text-xs text-surface-500 flex items-center gap-1">
          <span
            class="px-1 py-0.5 rounded bg-primary-600/30 text-primary-300 text-[10px] font-mono border border-primary-500/40"
            >{"{{user}}"}</span
          >
          = your character's name
        </p>
      {/if}

      <!-- Action Row: Expand dropdown toggle + Use button -->
      <div class="flex items-center gap-2">
        <!-- Expand Options Toggle -->
        <button
          class="h-9 flex-1 flex items-center justify-between px-3 rounded-lg border border-surface-600 bg-surface-800 text-sm text-surface-300 hover:border-surface-500 transition-colors"
          onclick={() => (showExpandOptions = !showExpandOptions)}
        >
          <span class="flex items-center gap-2">
            <Sparkles class="h-4 w-4 text-accent-400" />
            <span>Adjust with AI</span>
          </span>
          <ChevronDown
            class="h-4 w-4 text-surface-500 transition-transform {showExpandOptions
              ? 'rotate-180'
              : ''}"
          />
        </button>

        <!-- Use/Send Button -->
        <button
          class="h-9 flex items-center justify-center gap-2 px-4 min-w-[36px] rounded-lg bg-accent-600 text-surface-100 hover:bg-accent-500 disabled:bg-surface-700 disabled:text-surface-500 disabled:cursor-not-allowed transition-colors"
          onclick={onUseAsIs}
          disabled={!settingSeed.trim()}
          title="Use this setting"
        >
          <Send class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">Use</span>
        </button>
      </div>

      <!-- Expand Options Dropdown -->
      {#if showExpandOptions}
        <div
          class="card bg-surface-900 p-3"
          transition:slide={{ duration: 150 }}
        >
          <div>
            <label class="mb-1 block text-xs font-medium text-surface-400">
              Describe what you want to adjust (optional)
            </label>
            <textarea
              value={settingElaborationGuidance}
              oninput={(e) => onGuidanceChange(e.currentTarget.value)}
              placeholder="e.g., Focus on dark gothic atmosphere, add steampunk elements..."
              class="input min-h-[60px] resize-none text-sm"
              rows="2"
            ></textarea>
          </div>
          <button
            class="btn btn-secondary w-full flex items-center justify-center gap-2"
            onclick={onExpandSetting}
            disabled={isExpandingSetting || !settingSeed.trim()}
          >
            {#if isExpandingSetting}
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>Expanding...</span>
            {:else}
              <Sparkles class="h-4 w-4" />
              <span>Expand with AI</span>
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <!-- Error Message -->
    {#if settingError}
      <p class="text-sm text-red-400">{settingError}</p>
    {/if}
  </div>

  <!-- DIVIDER: Load from Vault -->
  <div class="flex items-center justify-center gap-3">
    <div class="h-px flex-1 bg-surface-700"></div>
    <span class="text-xs text-surface-500 flex items-center gap-1">
      <Archive class="h-3 w-3" />
      Or load from vault
    </span>
    <div class="h-px flex-1 bg-surface-700"></div>
  </div>

  <!-- SECTION 2: Load from Vault -->
  <div class="space-y-1 max-h-[15rem] overflow-y-auto">
    {#if hasVaultScenarios}
      <p class="text-surface-400 text-xs">
        Select a previously saved scenario.
      </p>
    {/if}
    <div class="-mt-3">
      <VaultScenarioBrowser
        onSelect={handleSelectFromVault}
        selectedScenarioId={loadedVaultScenarioId}
        {onNavigateToVault}
      />
    </div>
  </div>

  <!-- Card Import Status -->
  {#if importedCardNpcs.length > 0}
    <div
      class="flex items-center justify-between bg-green-500/10 border border-green-500/30 p-2 rounded text-xs"
    >
      <span class="text-green-400 flex items-center gap-1">
        <Check class="h-3 w-3" />
        Imported: {importedCardNpcs.map((n) => n.name).join(", ")}
      </span>
      <button
        class="text-surface-400 hover:text-surface-200"
        onclick={onClearCardImport}
      >
        <X class="h-3 w-3" />
      </button>
    </div>
  {/if}
  {#if cardImportError}
    <p class="text-xs text-red-400">{cardImportError}</p>
  {/if}

  <!-- DIVIDER: Selected Setting (only shows when selected) -->
  {#if expandedSetting}
    <div class="flex items-center justify-center gap-3">
      <div class="h-px flex-1 bg-surface-700"></div>
      <span class="text-xs text-surface-500 flex items-center gap-1">
        <Check class="h-3 w-3" />
        Selected Scenario
      </span>
      <div class="h-px flex-1 bg-surface-700"></div>
    </div>
  {/if}

  <!-- SECTION 3: Selected Setting (only shows when selected) -->
  {#if expandedSetting}
    <div
      class="card bg-surface-900 p-3 space-y-2"
      transition:slide={{ duration: 200 }}
    >
      <!-- Header with actions -->
      <div class="flex items-center gap-5">
        <span class="text-sm font-medium text-surface-100"
          >Selected Setting</span
        >
        <div class="flex-1"></div>
        <button
          class="flex items-center gap-1.5 rounded hover:bg-surface-700 transition-colors text-xs font-medium {savedScenarioToVaultConfirm
            ? 'text-green-400'
            : 'text-surface-400 hover:text-green-400'}"
          onclick={onSaveToVault}
          disabled={!settingSeed.trim() || savedScenarioToVaultConfirm}
          title={savedScenarioToVaultConfirm ? "Saved!" : "Save to vault"}
        >
          {#if savedScenarioToVaultConfirm}
            <Check class="h-3.5 w-3.5" />
            <span>Saved</span>
          {:else}
            <Archive class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Save to Vault</span>
          {/if}
        </button>
        <button
          class="flex items-center gap-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-100 transition-colors text-xs font-medium"
          onclick={isEditingDescription
            ? handleSaveDescription
            : handleEditDescription}
          title={isEditingDescription ? "Save" : "Edit"}
        >
          {#if isEditingDescription}
            <Check class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Save</span>
          {:else}
            <PenTool class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Edit</span>
          {/if}
        </button>
        {#if isEditingDescription}
          <button
            class="flex items-center gap-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-100 transition-colors text-xs font-medium"
            onclick={handleCancelDescriptionEdit}
            title="Cancel"
          >
            <X class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Cancel</span>
          </button>
        {/if}
        <button
          class="flex items-center gap-1.5 rounded hover:bg-surface-700 text-accent-400 hover:text-accent-300 transition-colors text-xs font-medium"
          onclick={onExpandFurther}
          disabled={isExpandingSetting}
          title="Refine with AI"
        >
          <Sparkles
            class="h-3.5 w-3.5 {isExpandingSetting ? 'animate-pulse' : ''}"
          />
          <span class="hidden sm:inline">Refine</span>
        </button>
      </div>

      <!-- Description -->
      {#if isEditingDescription}
        <textarea
          value={editDescription}
          oninput={(e) => (editDescription = e.currentTarget.value)}
          placeholder="Edit description..."
          class="input min-h-[100px] resize-y text-sm"
          rows="4"
        ></textarea>
      {:else}
        <p class="text-sm text-surface-300 whitespace-pre-wrap">
          {expandedSetting.description}
        </p>
      {/if}

      <!-- Locations -->
      {#if expandedSetting.keyLocations.length > 0}
        <div class="text-sm text-surface-400">
          <span class="font-medium">Locations:</span>
          {expandedSetting.keyLocations.map((l) => l.name).join(", ")}
        </div>
      {/if}

      <!-- Themes -->
      {#if expandedSetting.themes.length > 0}
        <div class="flex flex-wrap gap-1.5">
          {#each expandedSetting.themes as theme}
            <span
              class="px-2 py-0.5 rounded-full bg-surface-700 text-xs text-surface-300"
              >{theme}</span
            >
          {/each}
        </div>
      {/if}

      <!-- Refinement input -->
      <input
        type="text"
        value={settingElaborationGuidance}
        oninput={(e) => onGuidanceChange(e.currentTarget.value)}
        placeholder="Refinement notes (optional)..."
        class="input text-sm py-1.5"
      />
    </div>
  {/if}
</div>
