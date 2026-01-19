<script lang="ts">
  import {
    User,
    Loader2,
    X,
    Wand2,
    ImageUp,
  } from "lucide-svelte";
  import { normalizeImageDataUrl } from "$lib/utils/image";
  import type { GeneratedProtagonist, GeneratedCharacter } from "../wizardTypes";

  interface Props {
    protagonist: GeneratedProtagonist | null;
    supportingCharacters: GeneratedCharacter[];
    imageGenerationEnabled: boolean;
    
    // Protagonist portrait
    protagonistVisualDescriptors: string;
    protagonistPortrait: string | null;
    isGeneratingProtagonistPortrait: boolean;
    isUploadingProtagonistPortrait: boolean;
    
    // Supporting character portraits (keyed by name)
    supportingCharacterVisualDescriptors: Record<string, string>;
    supportingCharacterPortraits: Record<string, string | null>;
    generatingPortraitName: string | null;
    uploadingCharacterName: string | null;
    
    portraitError: string | null;
    
    // Handlers
    onProtagonistDescriptorsChange: (value: string) => void;
    onGenerateProtagonistPortrait: () => void;
    onRemoveProtagonistPortrait: () => void;
    onProtagonistPortraitUpload: (event: Event) => void;
    
    onSupportingDescriptorsChange: (name: string, value: string) => void;
    onGenerateSupportingPortrait: (name: string) => void;
    onRemoveSupportingPortrait: (name: string) => void;
    onSupportingPortraitUpload: (event: Event, name: string) => void;
  }

  let {
    protagonist,
    supportingCharacters,
    imageGenerationEnabled,
    protagonistVisualDescriptors,
    protagonistPortrait,
    isGeneratingProtagonistPortrait,
    isUploadingProtagonistPortrait,
    supportingCharacterVisualDescriptors,
    supportingCharacterPortraits,
    generatingPortraitName,
    uploadingCharacterName,
    portraitError,
    onProtagonistDescriptorsChange,
    onGenerateProtagonistPortrait,
    onRemoveProtagonistPortrait,
    onProtagonistPortraitUpload,
    onSupportingDescriptorsChange,
    onGenerateSupportingPortrait,
    onRemoveSupportingPortrait,
    onSupportingPortraitUpload,
  }: Props = $props();
</script>

<div class="space-y-4">
  <p class="text-surface-400">
    Upload or generate portrait images for your characters. In portrait
    mode, only characters with portraits can appear in story images.
  </p>

  {#if !imageGenerationEnabled}
    <div class="card bg-amber-500/10 border-amber-500/30 p-4">
      <p class="text-sm text-amber-400">
        Image generation is not configured. You can still upload
        portraits manually, or enable generation in Settings &gt; Image
        Generation.
      </p>
    </div>
  {/if}

  {#if portraitError}
    <div class="card bg-red-500/10 border-red-500/30 p-3">
      <p class="text-sm text-red-400">{portraitError}</p>
    </div>
  {/if}

  <!-- Protagonist Portrait -->
  {#if protagonist}
    <div class="card bg-surface-900 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-medium text-surface-100">{protagonist.name}</h3>
        <span
          class="text-xs px-2 py-0.5 rounded bg-primary-500/20 text-primary-400"
          >Protagonist</span
        >
      </div>

      <div class="flex gap-4">
        <!-- Portrait Preview -->
        <div class="shrink-0">
          {#if protagonistPortrait}
            <div class="relative">
              <img
                src={normalizeImageDataUrl(protagonistPortrait) ?? ""}
                alt="{protagonist.name} portrait"
                class="w-24 h-24 rounded-lg object-cover ring-1 ring-surface-600"
              />
              <button
                class="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                onclick={onRemoveProtagonistPortrait}
                title="Remove portrait"
              >
                <X class="h-3 w-3" />
              </button>
            </div>
          {:else}
            <div
              class="w-24 h-24 rounded-lg border-2 border-dashed border-surface-600 bg-surface-800 flex items-center justify-center"
            >
              <User class="h-8 w-8 text-surface-600" />
            </div>
          {/if}
        </div>

        <!-- Appearance Input & Generate/Upload Buttons -->
        <div class="flex-1 space-y-2">
          <div>
            <label
              class="mb-1 block text-xs font-medium text-surface-400"
              >Appearance (comma-separated)</label
            >
            <textarea
              value={protagonistVisualDescriptors}
              oninput={(e) => onProtagonistDescriptorsChange(e.currentTarget.value)}
              placeholder="e.g., long silver hair, violet eyes, fair skin, elegant dark blue coat..."
              class="input text-sm min-h-[60px] resize-none"
              rows="2"
            ></textarea>
          </div>
          <div class="flex gap-2">
            <label
              class="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
            >
              {#if isUploadingProtagonistPortrait}
                <Loader2 class="h-3 w-3 animate-spin" />
                Uploading...
              {:else}
                <ImageUp class="h-3 w-3" />
                Upload
              {/if}
              <input
                type="file"
                accept="image/*"
                class="hidden"
                onchange={onProtagonistPortraitUpload}
                disabled={isUploadingProtagonistPortrait ||
                  isGeneratingProtagonistPortrait}
              />
            </label>
            {#if imageGenerationEnabled}
              <button
                class="btn btn-secondary btn-sm flex items-center gap-1"
                onclick={onGenerateProtagonistPortrait}
                disabled={isGeneratingProtagonistPortrait ||
                  isUploadingProtagonistPortrait ||
                  !protagonistVisualDescriptors.trim()}
                title={!protagonistVisualDescriptors.trim()
                  ? "Add appearance descriptors to generate"
                  : ""}
              >
                {#if isGeneratingProtagonistPortrait}
                  <Loader2 class="h-3 w-3 animate-spin" />
                  Generating...
                {:else}
                  <Wand2 class="h-3 w-3" />
                  {protagonistPortrait ? "Regenerate" : "Generate"}
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div
      class="card bg-surface-900 border-dashed border-2 border-surface-600 p-4 text-center"
    >
      <p class="text-surface-400 text-sm">
        No protagonist created. Go back to step 5 to create one.
      </p>
    </div>
  {/if}

  <!-- Supporting Character Portraits -->
  {#if supportingCharacters.length > 0}
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-surface-300">
        Supporting Characters
      </h4>
      {#each supportingCharacters as char, index}
        <div class="card bg-surface-900 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-surface-100">{char.name}</h3>
            <span
              class="text-xs px-2 py-0.5 rounded bg-accent-500/20 text-accent-400"
              >{char.role}</span
            >
          </div>

          <div class="flex gap-4">
            <!-- Portrait Preview -->
            <div class="shrink-0">
              {#if supportingCharacterPortraits[char.name]}
                <div class="relative">
                  <img
                    src={normalizeImageDataUrl(
                      supportingCharacterPortraits[char.name],
                    ) ?? ""}
                    alt="{char.name} portrait"
                    class="w-24 h-24 rounded-lg object-cover ring-1 ring-surface-600"
                  />
                  <button
                    class="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                    onclick={() =>
                      onRemoveSupportingPortrait(char.name)}
                    title="Remove portrait"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </div>
              {:else}
                <div
                  class="w-24 h-24 rounded-lg border-2 border-dashed border-surface-600 bg-surface-800 flex items-center justify-center"
                >
                  <User class="h-8 w-8 text-surface-600" />
                </div>
              {/if}
            </div>

            <!-- Appearance Input & Generate/Upload Buttons -->
            <div class="flex-1 space-y-2">
              <div>
                <label
                  class="mb-1 block text-xs font-medium text-surface-400"
                  >Appearance (comma-separated)</label
                >
                <textarea
                  value={supportingCharacterVisualDescriptors[char.name] || ""}
                  oninput={(e) => onSupportingDescriptorsChange(char.name, e.currentTarget.value)}
                  placeholder="e.g., short dark hair, green eyes, athletic build..."
                  class="input text-sm min-h-[60px] resize-none"
                  rows="2"
                ></textarea>
              </div>
              <div class="flex gap-2">
                <label
                  class="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
                >
                  {#if uploadingCharacterName === char.name}
                    <Loader2 class="h-3 w-3 animate-spin" />
                    Uploading...
                  {:else}
                    <ImageUp class="h-3 w-3" />
                    Upload
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    onchange={(e) =>
                      onSupportingPortraitUpload(e, char.name)}
                    disabled={uploadingCharacterName !== null ||
                      generatingPortraitName !== null}
                  />
                </label>
                {#if imageGenerationEnabled}
                  <button
                    class="btn btn-secondary btn-sm flex items-center gap-1"
                    onclick={() =>
                      onGenerateSupportingPortrait(char.name)}
                    disabled={generatingPortraitName !== null ||
                      uploadingCharacterName !== null ||
                      !(
                        supportingCharacterVisualDescriptors[
                          char.name
                        ] || ""
                      ).trim()}
                    title={!(
                      supportingCharacterVisualDescriptors[char.name] ||
                      ""
                    ).trim()
                      ? "Add appearance descriptors to generate"
                      : ""}
                  >
                    {#if generatingPortraitName === char.name}
                      <Loader2 class="h-3 w-3 animate-spin" />
                      Generating...
                    {:else}
                      <Wand2 class="h-3 w-3" />
                      {supportingCharacterPortraits[char.name]
                        ? "Regenerate"
                        : "Generate"}
                    {/if}
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if !protagonist && supportingCharacters.length === 0}
    <div
      class="card bg-surface-900 border-dashed border-2 border-surface-600 p-6 text-center"
    >
      <p class="text-surface-400">
        No characters created yet. Go back to step 5 to create
        characters.
      </p>
    </div>
  {/if}

  <p class="text-xs text-surface-500 text-center">
    Portraits are optional. You can skip this step and add portraits
    later from the Characters panel.
  </p>
</div>
