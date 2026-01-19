<script lang="ts">
  import {
    Archive,
    Loader2,
    Check,
    Sparkles,
    X,
    PenTool,
    User,
    Plus,
    RefreshCw,
    Trash2,
  } from "lucide-svelte";
  import VaultCharacterPicker from "$lib/components/vault/VaultCharacterPicker.svelte";
  import type { VaultCharacter } from "$lib/types";
  import type { ExpandedSetting, GeneratedProtagonist, GeneratedCharacter, StoryMode } from "../wizardTypes";

  interface Props {
    selectedMode: StoryMode;
    expandedSetting: ExpandedSetting | null;
    protagonist: GeneratedProtagonist | null;
    supportingCharacters: GeneratedCharacter[];
    
    // Manual protagonist input
    manualCharacterName: string;
    manualCharacterDescription: string;
    manualCharacterBackground: string;
    manualCharacterMotivation: string;
    manualCharacterTraits: string;
    showManualInput: boolean;
    characterElaborationGuidance: string;
    
    // Supporting character form
    showSupportingCharacterForm: boolean;
    editingSupportingCharacterIndex: number | null;
    supportingCharacterName: string;
    supportingCharacterRole: string;
    supportingCharacterDescription: string;
    supportingCharacterRelationship: string;
    supportingCharacterTraits: string;
    supportingCharacterGuidance: string;
    
    // Loading states
    isGeneratingProtagonist: boolean;
    isElaboratingCharacter: boolean;
    isGeneratingCharacters: boolean;
    isElaboratingSupportingCharacter: boolean;
    protagonistError: string | null;
    
    // Vault states
    showProtagonistVaultPicker: boolean;
    showSupportingVaultPicker: boolean;
    savedToVaultConfirm: boolean;
    
    // Manual input handlers
    onManualNameChange: (value: string) => void;
    onManualDescriptionChange: (value: string) => void;
    onManualBackgroundChange: (value: string) => void;
    onManualMotivationChange: (value: string) => void;
    onManualTraitsChange: (value: string) => void;
    onShowManualInputChange: (show: boolean) => void;
    onCharacterGuidanceChange: (value: string) => void;
    
    // Supporting character form handlers
    onSupportingNameChange: (value: string) => void;
    onSupportingRoleChange: (value: string) => void;
    onSupportingDescriptionChange: (value: string) => void;
    onSupportingRelationshipChange: (value: string) => void;
    onSupportingTraitsChange: (value: string) => void;
    onSupportingGuidanceChange: (value: string) => void;
    
    // Action handlers
    onUseManualCharacter: () => void;
    onElaborateCharacter: () => void;
    onElaborateCharacterFurther: () => void;
    onGenerateProtagonist: () => void;
    onEditCharacter: () => void;
    onSaveToVault: () => void;
    
    // Supporting character actions
    onOpenSupportingForm: () => void;
    onEditSupportingCharacter: (index: number) => void;
    onCancelSupportingForm: () => void;
    onUseSupportingAsIs: () => void;
    onElaborateSupportingCharacter: () => void;
    onDeleteSupportingCharacter: (index: number) => void;
    onGenerateCharacters: () => void;
    
    // Vault handlers
    onShowProtagonistVaultPicker: (show: boolean) => void;
    onShowSupportingVaultPicker: (show: boolean) => void;
    onSelectProtagonistFromVault: (character: VaultCharacter) => void;
    onSelectSupportingFromVault: (character: VaultCharacter) => void;
  }

  let {
    selectedMode,
    expandedSetting,
    protagonist,
    supportingCharacters,
    manualCharacterName,
    manualCharacterDescription,
    manualCharacterBackground,
    manualCharacterMotivation,
    manualCharacterTraits,
    showManualInput,
    characterElaborationGuidance,
    showSupportingCharacterForm,
    editingSupportingCharacterIndex,
    supportingCharacterName,
    supportingCharacterRole,
    supportingCharacterDescription,
    supportingCharacterRelationship,
    supportingCharacterTraits,
    supportingCharacterGuidance,
    isGeneratingProtagonist,
    isElaboratingCharacter,
    isGeneratingCharacters,
    isElaboratingSupportingCharacter,
    protagonistError,
    showProtagonistVaultPicker,
    showSupportingVaultPicker,
    savedToVaultConfirm,
    onManualNameChange,
    onManualDescriptionChange,
    onManualBackgroundChange,
    onManualMotivationChange,
    onManualTraitsChange,
    onShowManualInputChange,
    onCharacterGuidanceChange,
    onSupportingNameChange,
    onSupportingRoleChange,
    onSupportingDescriptionChange,
    onSupportingRelationshipChange,
    onSupportingTraitsChange,
    onSupportingGuidanceChange,
    onUseManualCharacter,
    onElaborateCharacter,
    onElaborateCharacterFurther,
    onGenerateProtagonist,
    onEditCharacter,
    onSaveToVault,
    onOpenSupportingForm,
    onEditSupportingCharacter,
    onCancelSupportingForm,
    onUseSupportingAsIs,
    onElaborateSupportingCharacter,
    onDeleteSupportingCharacter,
    onGenerateCharacters,
    onShowProtagonistVaultPicker,
    onShowSupportingVaultPicker,
    onSelectProtagonistFromVault,
    onSelectSupportingFromVault,
  }: Props = $props();
</script>

<div class="space-y-4">
  <!-- Vault Picker Modals -->
  {#if showProtagonistVaultPicker}
    <VaultCharacterPicker
      filterType="protagonist"
      onSelect={onSelectProtagonistFromVault}
      onClose={() => onShowProtagonistVaultPicker(false)}
    />
  {/if}

  {#if showSupportingVaultPicker}
    <VaultCharacterPicker
      filterType="supporting"
      onSelect={onSelectSupportingFromVault}
      onClose={() => onShowSupportingVaultPicker(false)}
    />
  {/if}
  
  {#if !expandedSetting}
    <div class="card bg-amber-500/10 border-amber-500/30 p-4">
      <p class="text-sm text-amber-400">
        Go back to Step 4 and expand your setting first. This helps
        create a more fitting character.
      </p>
    </div>
  {:else}
    <!-- Protagonist Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-surface-400 mb-3">
            {selectedMode === "adventure"
              ? "Create your character for this adventure."
              : "Define the main characters for your story."}
          </p>
          <h3 class="font-medium text-surface-100">
            {selectedMode === "adventure"
              ? "Your Character"
              : "Main Character"}
          </h3>
        </div>
        <button
          class="btn btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-end mt-1 sm:mt-0"
          onclick={() => onShowProtagonistVaultPicker(true)}
          title="Select a character from your vault"
        >
          <Archive class="h-3 w-3" />
          <span class="sm:hidden">Vault</span>
          <span class="hidden sm:inline">Use from Vault</span>
        </button>
      </div>

      {#if protagonistError}
        <p class="text-sm text-red-400">{protagonistError}</p>
      {/if}

      {#if showManualInput && !protagonist}
        <!-- Manual Character Input Form -->
        <div class="card bg-surface-900 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm text-surface-400">
              Enter your character details below. You can use them
              as-is, have AI elaborate on them, or generate a completely
              new character.
            </p>
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Character Name</label
            >
            <input
              type="text"
              value={manualCharacterName}
              oninput={(e) => onManualNameChange(e.currentTarget.value)}
              placeholder="e.g., Alex, Jordan, Sam..."
              class="input"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Description</label
            >
            <textarea
              value={manualCharacterDescription}
              oninput={(e) => onManualDescriptionChange(e.currentTarget.value)}
              placeholder="Physical appearance, demeanor, notable features..."
              class="input min-h-[60px] resize-none"
              rows="2"
            ></textarea>
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Background</label
            >
            <textarea
              value={manualCharacterBackground}
              oninput={(e) => onManualBackgroundChange(e.currentTarget.value)}
              placeholder="Where they come from, their history..."
              class="input min-h-[60px] resize-none"
              rows="2"
            ></textarea>
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Motivation</label
            >
            <input
              type="text"
              value={manualCharacterMotivation}
              oninput={(e) => onManualMotivationChange(e.currentTarget.value)}
              placeholder="What drives them? What do they seek?"
              class="input"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Traits (comma-separated)</label
            >
            <input
              type="text"
              value={manualCharacterTraits}
              oninput={(e) => onManualTraitsChange(e.currentTarget.value)}
              placeholder="e.g., brave, curious, stubborn, compassionate..."
              class="input"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Elaboration guidance (optional)</label
            >
            <textarea
              value={characterElaborationGuidance}
              oninput={(e) => onCharacterGuidanceChange(e.currentTarget.value)}
              placeholder="e.g., Make them more cynical and world-weary, add a tragic backstory..."
              class="input min-h-[50px] resize-none text-sm"
              rows="2"
            ></textarea>
          </div>

          <div
            class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2 border-t border-surface-700"
          >
            <button
              class="btn btn-secondary btn-sm flex items-center justify-center gap-2"
              onclick={onUseManualCharacter}
              disabled={!manualCharacterName.trim()}
              title="Use character as entered"
            >
              <User class="h-3 w-3" />
              <span>Use As-Is</span>
            </button>
            <button
              class="btn btn-primary btn-sm flex items-center justify-center gap-2"
              onclick={onElaborateCharacter}
              disabled={isElaboratingCharacter ||
                (!manualCharacterName.trim() &&
                  !manualCharacterDescription.trim() &&
                  !manualCharacterBackground.trim())}
              title="Have AI expand on your character details"
            >
              {#if isElaboratingCharacter}
                <Loader2 class="h-3 w-3 animate-spin" />
                <span>Elaborating...</span>
              {:else}
                <Sparkles class="h-3 w-3" />
                <span class="sm:hidden">Elaborate</span>
                <span class="hidden sm:inline">Elaborate with AI</span>
              {/if}
            </button>
            <button
              class="btn btn-secondary btn-sm flex items-center justify-center gap-2"
              onclick={onGenerateProtagonist}
              disabled={isGeneratingProtagonist}
              title="Generate a completely new character from scratch"
            >
              {#if isGeneratingProtagonist}
                <RefreshCw class="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              {:else}
                <RefreshCw class="h-3 w-3" />
                <span class="sm:hidden">Generate</span>
                <span class="hidden sm:inline">Generate New</span>
              {/if}
            </button>
            <button
              class="btn btn-secondary btn-sm flex items-center justify-center gap-2 sm:ml-auto"
              onclick={onSaveToVault}
              disabled={!manualCharacterName.trim()}
              title="Save this character to your vault for reuse"
            >
              <Archive class="h-3 w-3" />
              <span class="hidden sm:inline"
                >{savedToVaultConfirm
                  ? "Saved!"
                  : "Save to Vault"}</span
              >
              <span class="sm:hidden"
                >{savedToVaultConfirm ? "Saved" : "Save"}</span
              >
            </button>
          </div>
        </div>
      {:else if protagonist}
        <!-- Generated/Final Character Display -->
        <div class="card bg-surface-900 p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-semibold text-surface-100 truncate">
              {protagonist.name}
            </h4>
            <div class="flex items-center gap-3 shrink-0">
              <button
                class="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
                onclick={onEditCharacter}
                title="Edit character details"
              >
                <PenTool class="h-3 w-3" />
                <span>Edit</span>
              </button>
              <button
                class="flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
                onclick={onElaborateCharacterFurther}
                disabled={isElaboratingCharacter}
                title="Re-elaborate with new guidance"
              >
                <Sparkles
                  class="h-3 w-3 {isElaboratingCharacter
                    ? 'animate-pulse'
                    : ''}"
                />
                <span
                  >{isElaboratingCharacter
                    ? "Refining..."
                    : "Refine"}</span
                >
              </button>
            </div>
          </div>
          <p class="text-sm text-surface-300">
            {protagonist.description}
          </p>
          {#if protagonist.background}
            <p class="text-sm text-surface-400">
              <strong>Background:</strong>
              {protagonist.background}
            </p>
          {/if}
          {#if protagonist.motivation}
            <p class="text-sm text-surface-400">
              <strong>Motivation:</strong>
              {protagonist.motivation}
            </p>
          {/if}
          {#if protagonist.traits && protagonist.traits.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each protagonist.traits as trait}
                <span
                  class="px-2 py-1 rounded-md bg-primary-500/20 text-xs text-primary-300 border border-primary-500/30"
                  >{trait}</span
                >
              {/each}
            </div>
          {/if}

          <!-- Guidance field for iterative refinement -->
          <div class="pt-2 border-t border-surface-700">
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
            >
              Refinement guidance (optional)
            </label>
            <textarea
              value={characterElaborationGuidance}
              oninput={(e) => onCharacterGuidanceChange(e.currentTarget.value)}
              placeholder="e.g., Add internal conflict, make them more mysterious..."
              class="input min-h-[50px] resize-none text-sm"
              rows="2"
            ></textarea>
          </div>
        </div>
      {:else}
        <!-- Fallback: Show generate button -->
        <div
          class="card bg-surface-900 border-dashed border-2 border-surface-600 p-6 text-center"
        >
          <p class="text-surface-400 mb-3">
            Enter your own character details or generate one with AI
          </p>
          <div class="grid grid-cols-1 sm:flex sm:justify-center gap-2">
            <button
              class="btn btn-secondary btn-sm justify-center"
              onclick={() => onShowManualInputChange(true)}
            >
              Enter Manually
            </button>
            <button
              class="btn btn-primary btn-sm flex items-center justify-center gap-1"
              onclick={onGenerateProtagonist}
              disabled={isGeneratingProtagonist}
            >
              {#if isGeneratingProtagonist}
                <Loader2 class="h-3 w-3 animate-spin" />
              {:else}
                <Sparkles class="h-3 w-3" />
              {/if}
              Generate Character
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Hint when no protagonist is defined -->
    {#if !protagonist && !showManualInput}
      <p class="text-xs text-surface-500 italic">
        Tip: While optional, having a protagonist helps the AI create
        more personalized story content.
      </p>
    {/if}

    <!-- Supporting Characters -->
    <div class="space-y-3 pt-4 border-t border-surface-700">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <h3 class="font-medium text-surface-100">Supporting Cast</h3>
        <div class="grid grid-cols-3 sm:flex gap-2 w-full sm:w-auto">
          <button
            class="btn btn-secondary btn-sm flex items-center justify-center gap-1"
            onclick={() => onShowSupportingVaultPicker(true)}
            disabled={showSupportingCharacterForm}
            title="Select from vault"
          >
            <Archive class="h-3 w-3" />
            <span>Vault</span>
          </button>
          <button
            class="btn btn-secondary btn-sm flex items-center justify-center gap-1"
            onclick={onOpenSupportingForm}
            disabled={showSupportingCharacterForm}
          >
            <Plus class="h-3 w-3" />
            <span>Add</span>
          </button>
          <button
            class="btn btn-secondary btn-sm flex items-center justify-center gap-1"
            onclick={onGenerateCharacters}
            disabled={isGeneratingCharacters || !protagonist}
            title="Generate 3 AI characters at once"
          >
            {#if isGeneratingCharacters}
              <Loader2 class="h-3 w-3 animate-spin" />
              <span class="hidden sm:inline">Generating...</span>
            {:else}
              <Sparkles class="h-3 w-3" />
              <span class="sm:hidden">Gen 3</span>
              <span class="hidden sm:inline">Generate 3</span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Supporting Character Form -->
      {#if showSupportingCharacterForm}
        <div class="card bg-surface-900 p-4 space-y-4">
          <p class="text-sm text-surface-400">
            {editingSupportingCharacterIndex !== null ? "Edit" : "Add"} a
            supporting character. You can use them as-is or have AI elaborate
            on them.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                class="mb-1 block text-xs font-medium text-surface-400"
                >Name</label
              >
              <input
                type="text"
                value={supportingCharacterName}
                oninput={(e) => onSupportingNameChange(e.currentTarget.value)}
                placeholder="e.g., Lady Vivienne"
                class="input"
              />
            </div>
            <div>
              <label
                class="mb-1 block text-xs font-medium text-surface-400"
                >Role</label
              >
              <input
                type="text"
                value={supportingCharacterRole}
                oninput={(e) => onSupportingRoleChange(e.currentTarget.value)}
                placeholder="e.g., ally, antagonist, mentor..."
                class="input"
              />
            </div>
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Description</label
            >
            <textarea
              value={supportingCharacterDescription}
              oninput={(e) => onSupportingDescriptionChange(e.currentTarget.value)}
              placeholder="Physical appearance, personality, notable features..."
              class="input min-h-[60px] resize-none"
              rows="2"
            ></textarea>
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Relationship to Protagonist</label
            >
            <input
              type="text"
              value={supportingCharacterRelationship}
              oninput={(e) => onSupportingRelationshipChange(e.currentTarget.value)}
              placeholder="e.g., Childhood friend, rival from academy..."
              class="input"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Traits (comma-separated)</label
            >
            <input
              type="text"
              value={supportingCharacterTraits}
              oninput={(e) => onSupportingTraitsChange(e.currentTarget.value)}
              placeholder="e.g., cunning, loyal, mysterious..."
              class="input"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Elaboration guidance (optional)</label
            >
            <textarea
              value={supportingCharacterGuidance}
              oninput={(e) => onSupportingGuidanceChange(e.currentTarget.value)}
              placeholder="e.g., Make them more sinister, add a hidden agenda..."
              class="input min-h-[50px] resize-none text-sm"
              rows="2"
            ></textarea>
          </div>

          <div
            class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2 border-t border-surface-700"
          >
            <button
              class="btn btn-secondary btn-sm flex items-center justify-center gap-1 col-span-1"
              onclick={onUseSupportingAsIs}
              disabled={!supportingCharacterName.trim()}
              title="Use character as entered"
            >
              <Check class="h-3 w-3" />
              <span>Use As-Is</span>
            </button>
            <button
              class="btn btn-primary btn-sm flex items-center justify-center gap-1 col-span-1"
              onclick={onElaborateSupportingCharacter}
              disabled={isElaboratingSupportingCharacter ||
                (!supportingCharacterName.trim() &&
                  !supportingCharacterDescription.trim())}
              title="Have AI expand on character details"
            >
              {#if isElaboratingSupportingCharacter}
                <Loader2 class="h-3 w-3 animate-spin" />
                <span>Elaborating...</span>
              {:else}
                <Sparkles class="h-3 w-3" />
                <span class="sm:hidden">Elaborate</span>
                <span class="hidden sm:inline">Elaborate with AI</span>
              {/if}
            </button>
            <button
              class="btn btn-secondary btn-sm flex items-center justify-center gap-1 col-span-2 sm:w-auto"
              onclick={onCancelSupportingForm}
            >
              <X class="h-3 w-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      {/if}

      <!-- Character List -->
      {#if supportingCharacters.length > 0}
        <div class="space-y-2">
          {#each supportingCharacters as char, index}
            <div class="card bg-surface-900 p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-medium text-surface-100"
                  >{char.name}</span
                >
                <span
                  class="text-xs px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400"
                  >{char.role}</span
                >
              </div>
              <p class="text-sm text-surface-300">
                {char.description}
              </p>
              {#if char.relationship}
                <p class="text-xs text-surface-400 mt-1">
                  {char.relationship}
                </p>
              {/if}
              {#if char.traits && char.traits.length > 0}
                <div class="flex flex-wrap gap-2 mt-2">
                  {#each char.traits as trait}
                    <span
                      class="px-2 py-1 rounded-md bg-surface-800 text-xs text-surface-300 border border-surface-700"
                      >{trait}</span
                    >
                  {/each}
                </div>
              {/if}
              <div
                class="flex justify-center gap-3 mt-3 pt-2 border-t border-surface-800"
              >
                <button
                  class="p-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
                  onclick={() => onEditSupportingCharacter(index)}
                  title="Edit character"
                >
                  <PenTool class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  onclick={() => onDeleteSupportingCharacter(index)}
                  title="Delete character"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else if !showSupportingCharacterForm}
        <p class="text-sm text-surface-500 italic">
          No supporting characters yet. Add one manually or generate
          multiple with AI.
        </p>
      {/if}
    </div>
  {/if}
</div>
