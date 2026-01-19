<script lang="ts">
  import { slide } from "svelte/transition";
  import {
    Upload,
    Archive,
    Loader2,
    FileJson,
    ChevronRight,
    AlertCircle,
  } from "lucide-svelte";
  import VaultLorebookPicker from "$lib/components/vault/VaultLorebookPicker.svelte";
  import type { VaultLorebook } from "$lib/types";
  import type { ImportedLorebookItem, EntryType, ImportedEntry } from "../wizardTypes";
  import { getTypeCounts, getTypeColor } from "../wizardTypes";

  interface Props {
    importedLorebooks: ImportedLorebookItem[];
    isImporting: boolean;
    isClassifying: boolean;
    classificationProgress: { current: number; total: number };
    importError: string | null;
    showLorebookVaultPicker: boolean;
    onShowVaultPickerChange: (show: boolean) => void;
    onFileSelect: (event: Event) => void;
    onSelectFromVault: (lorebook: VaultLorebook) => void;
    onSaveToVault: (lorebook: ImportedLorebookItem) => void;
    onRemoveLorebook: (id: string) => void;
    onToggleExpanded: (id: string) => void;
    onClearAll: () => void;
    importFileInputRef: (el: HTMLInputElement | null) => void;
  }

  let {
    importedLorebooks,
    isImporting,
    isClassifying,
    classificationProgress,
    importError,
    showLorebookVaultPicker,
    onShowVaultPickerChange,
    onFileSelect,
    onSelectFromVault,
    onSaveToVault,
    onRemoveLorebook,
    onToggleExpanded,
    onClearAll,
    importFileInputRef,
  }: Props = $props();

  // Combined summary for display
  const importedEntries = $derived(
    importedLorebooks.flatMap((lb) => lb.entries),
  );

  const importSummary = $derived.by(() => {
    if (importedLorebooks.length === 0) return null;
    const entries = importedEntries;
    return {
      total: entries.length,
      withContent: entries.filter((e) => e.description?.trim()).length,
      byType: getTypeCounts(entries),
    };
  });
</script>

<div class="space-y-4">
  <!-- Vault Picker Modal -->
  {#if showLorebookVaultPicker}
    <VaultLorebookPicker
      onSelect={onSelectFromVault}
      onClose={() => onShowVaultPickerChange(false)}
    />
  {/if}

  <p class="text-surface-400">
    Import an existing lorebook to populate your world with characters,
    locations, and lore. This step is optional - you can skip it and add
    content later.
  </p>

  <!-- File Upload & Vault Area (always visible unless busy) -->
  {#if !isImporting && !isClassifying}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- File Upload -->
      <div
        class="card bg-surface-900 border-dashed border-2 border-surface-600 p-6 text-center hover:border-accent-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
        onclick={() => {
          const input = document.querySelector('input[type="file"][data-lorebook-input]') as HTMLInputElement;
          input?.click();
        }}
        onkeydown={(e) => {
          if (e.key === "Enter") {
            const input = document.querySelector('input[type="file"][data-lorebook-input]') as HTMLInputElement;
            input?.click();
          }
        }}
        role="button"
        tabindex="0"
      >
        <input
          type="file"
          accept=".json,application/json,*/*"
          class="hidden"
          data-lorebook-input
          use:importFileInputRef
          onchange={onFileSelect}
        />
        <Upload class="h-8 w-8 mb-2 text-surface-500" />
        <p class="text-surface-300 font-medium">
          {importedLorebooks.length > 0
            ? "Upload Another"
            : "Upload Lorebook"}
        </p>
        <p class="text-xs text-surface-500 mt-1">
          Supports SillyTavern format (.json)
        </p>
      </div>

      <!-- Vault Import -->
      <button
        class="card bg-surface-900 border-dashed border-2 border-surface-600 p-6 text-center hover:border-accent-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
        onclick={() => onShowVaultPickerChange(true)}
      >
        <Archive class="h-8 w-8 mb-2 text-surface-500" />
        <p class="text-surface-300 font-medium">Add from Vault</p>
        <p class="text-xs text-surface-500 mt-1">
          Use processed lorebooks
        </p>
      </button>
    </div>
  {:else if isImporting}
    <div
      class="card bg-surface-900 border-dashed border-2 border-surface-600 p-8 text-center"
    >
      <Loader2
        class="h-8 w-8 mx-auto mb-2 text-accent-400 animate-spin"
      />
      <p class="text-surface-300">Parsing lorebook...</p>
    </div>
  {:else if isClassifying}
    <div
      class="card bg-surface-900 border-dashed border-2 border-surface-600 p-8 text-center"
    >
      <Loader2
        class="h-8 w-8 mx-auto mb-2 text-accent-400 animate-spin"
      />
      <p class="text-surface-300 font-medium">
        Classifying entries with AI...
      </p>
      <p class="text-xs text-surface-500 mt-1">
        {classificationProgress.current} / {classificationProgress.total}
        entries
      </p>
      <div
        class="mt-3 w-full max-w-xs mx-auto bg-surface-700 rounded-full h-2"
      >
        <div
          class="bg-accent-500 h-2 rounded-full transition-all duration-300"
          style="width: {classificationProgress.total > 0
            ? (classificationProgress.current /
                classificationProgress.total) *
              100
            : 0}%"
        ></div>
      </div>
    </div>
  {/if}

  {#if importError}
    <div
      class="card bg-red-500/10 border-red-500/30 p-3 flex items-start gap-2"
    >
      <AlertCircle class="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <p class="text-sm text-red-400">{importError}</p>
    </div>
  {/if}

  <!-- List of Imported Lorebooks -->
  {#if importedLorebooks.length > 0}
    <div class="space-y-3">
      {#each importedLorebooks as lorebook (lorebook.id)}
        <div class="card bg-surface-900 p-4 transition-all">
          <!-- Header - Clickable for toggle -->
          <div
            class="flex items-center justify-between mb-2 cursor-pointer"
            onclick={() => onToggleExpanded(lorebook.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) =>
              e.key === "Enter" && onToggleExpanded(lorebook.id)}
          >
            <div class="flex items-center gap-2">
              <ChevronRight
                class="h-4 w-4 text-surface-500 transition-transform duration-200 {lorebook.expanded
                  ? 'rotate-90'
                  : ''}"
              />
              <FileJson class="h-5 w-5 text-accent-400" />
              <span
                class="font-medium text-surface-100 truncate max-w-[200px]"
                title={lorebook.filename}
              >
                {lorebook.filename}
              </span>
              <span class="text-xs text-surface-500">
                {lorebook.entries.length} entries
              </span>
              {#if lorebook.result.warnings.length > 0}
                <span
                  class="text-xs text-amber-400 ml-2"
                  title="{lorebook.result.warnings.length} warnings"
                >
                  ⚠️
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-2 z-10">
              {#if !lorebook.filename.includes("(from Vault)")}
                <button
                  class="flex items-center gap-1 text-xs text-surface-400 hover:text-accent-400 transition-colors p-1"
                  onclick={(e) => {
                    e.stopPropagation();
                    onSaveToVault(lorebook);
                  }}
                  title="Save to Vault for reuse"
                >
                  <Archive class="h-3 w-3" />
                  <span class="hidden sm:inline">Save</span>
                </button>
              {/if}
              <button
                class="text-xs text-surface-400 hover:text-red-400 transition-colors p-1"
                onclick={(e) => {
                  e.stopPropagation();
                  onRemoveLorebook(lorebook.id);
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <!-- Type breakdown (Always visible) -->
          <div class="flex flex-wrap gap-2 ml-6">
            {#each Object.entries(getTypeCounts(lorebook.entries)) as [type, count]}
              {#if count > 0}
                <span
                  class="px-2 py-1 rounded-full bg-surface-700 text-xs {getTypeColor(
                    type as EntryType,
                  )}"
                >
                  {type}: {count}
                </span>
              {/if}
            {/each}
          </div>

          <!-- Expanded Content -->
          {#if lorebook.expanded}
            <div
              class="mt-4 pt-4 border-t border-surface-700 space-y-4 ml-6"
              transition:slide
            >
              <!-- Preview (first 10) -->
              <div class="space-y-2">
                <h4
                  class="text-xs font-medium text-surface-400 uppercase"
                >
                  Preview (first 10)
                </h4>
                <div class="max-h-40 overflow-y-auto space-y-1">
                  {#each lorebook.entries.slice(0, 10) as entry}
                    <div
                      class="flex items-center gap-2 text-sm p-2 rounded bg-surface-800"
                    >
                      <span
                        class="px-1.5 py-0.5 rounded text-xs {getTypeColor(
                          entry.type,
                        )} bg-surface-700"
                      >
                        {entry.type}
                      </span>
                      <span class="text-surface-200 truncate flex-1"
                        >{entry.name}</span
                      >
                      {#if entry.keywords.length > 0}
                        <span class="text-xs text-surface-500"
                          >{entry.keywords.length} keywords</span
                        >
                      {/if}
                    </div>
                  {/each}
                  {#if lorebook.entries.length > 10}
                    <p
                      class="text-xs text-surface-500 text-center py-2"
                    >
                      ...and {lorebook.entries.length - 10} more entries
                    </p>
                  {/if}
                </div>
              </div>

              {#if lorebook.result.warnings.length > 0}
                <div class="text-xs text-amber-400">
                  {lorebook.result.warnings.length} warning(s) during import
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Combined Summary -->
    {#if importedLorebooks.length > 1 && importSummary}
      <div class="card bg-surface-800 p-3">
        <div class="flex justify-between items-center">
          <p class="text-sm text-surface-300">
            <strong>Total:</strong>
            {importSummary.total} entries across {importedLorebooks.length}
            lorebooks
          </p>
          <button
            class="text-xs text-surface-400 hover:text-surface-200"
            onclick={onClearAll}
          >
            Clear All
          </button>
        </div>
      </div>
    {/if}
  {/if}

  <p class="text-xs text-surface-500 text-center">
    Imported entries will be added to your story's lorebook after
    creation.
  </p>
</div>
