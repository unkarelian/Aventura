<script lang="ts">
  import { settings } from '$lib/stores/settings.svelte';
  import type { APIProfile, JSONSupportLevel } from '$lib/types';
  import { X, Plus, Trash2, RefreshCw, Check, AlertCircle, Globe, Key as KeyIcon, Box, Code2 } from 'lucide-svelte';
  import { ask } from '@tauri-apps/plugin-dialog';
  import { fetch } from '@tauri-apps/plugin-http';

  interface Props {
    isOpen: boolean;
    editingProfile?: APIProfile | null;
    onClose: () => void;
    onSave: (profile: APIProfile) => void;
  }

  let {
    isOpen,
    editingProfile = null,
    onClose,
    onSave,
  }: Props = $props();

  // Check if the current profile can be deleted
  let canDelete = $derived(editingProfile ? settings.canDeleteProfile(editingProfile.id) : false);
  let isDefaultProfile = $derived(editingProfile?.id === settings.getDefaultProfileIdForProvider());

  // Form state
  let name = $state('');
  let baseUrl = $state('');
  let apiKey = $state('');
  let customModels = $state<string[]>([]);
  let fetchedModels = $state<string[]>([]);
  let newModelInput = $state('');
  let setAsDefault = $state(false);
  let jsonSupport = $state<JSONSupportLevel>('none');

  // UI state
  let isFetchingModels = $state(false);
  let fetchError = $state<string | null>(null);
  let showApiKey = $state(false);
  let abortController: AbortController | null = null;

  // URL presets
  const urlPresets = [
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
    { name: 'NanoGPT', url: 'https://nano-gpt.com/api/v1' },
  ];

  // Initialize form when modal opens or editing profile changes
  $effect(() => {
    if (isOpen) {
      if (editingProfile) {
        name = editingProfile.name;
        baseUrl = editingProfile.baseUrl;
        apiKey = editingProfile.apiKey;
        customModels = [...editingProfile.customModels];
        fetchedModels = [...editingProfile.fetchedModels];
        setAsDefault = editingProfile.id === settings.getDefaultProfileIdForProvider();
        jsonSupport = editingProfile.jsonSupport ?? 'none';
      } else {
        // Reset form for new profile - start with empty fields
        name = '';
        baseUrl = settings.apiSettings.openaiApiURL;
        apiKey = '';  // API keys are not shared between profiles
        customModels = [];
        fetchedModels = [];
        setAsDefault = false;
        jsonSupport = 'json_schema';  // Default to json_schema for new profiles
      }
      newModelInput = '';
      fetchError = null;
      showApiKey = false;
    }
  });

  async function handleFetchModels() {
    if (!baseUrl) {
      fetchError = 'Please enter a base URL first';
      return;
    }

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    isFetchingModels = true;
    fetchError = null;
    // Clear old models before fetching new ones
    fetchedModels = [];

    try {
      const modelsUrl = baseUrl.replace(/\/$/, '') + '/models';
      const response = await fetch(modelsUrl, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle OpenAI-style response format
      if (data.data && Array.isArray(data.data)) {
        fetchedModels = data.data.map((m: { id: string }) => m.id);
      } else if (Array.isArray(data)) {
        fetchedModels = data.map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      fetchError = err instanceof Error ? err.message : 'Failed to fetch models';
    } finally {
      isFetchingModels = false;
    }
  }

  function handleAddCustomModel() {
    const model = newModelInput.trim();
    if (model && !customModels.includes(model)) {
      customModels = [...customModels, model];
      newModelInput = '';
    }
  }

  function handleRemoveCustomModel(model: string) {
    customModels = customModels.filter(m => m !== model);
  }

  function handleRemoveFetchedModel(model: string) {
    fetchedModels = fetchedModels.filter(m => m !== model);
  }

  function handleSelectPreset(preset: { name: string; url: string }) {
    if (!name) name = preset.name;
    baseUrl = preset.url;
    // Clear fetched models when switching presets
    fetchedModels = [];
    fetchError = null;
  }

  async function handleSave() {
    if (!name.trim() || !baseUrl.trim()) return;

    const profile: APIProfile = {
      id: editingProfile?.id || crypto.randomUUID(),
      name: name.trim(),
      baseUrl: baseUrl.trim().replace(/\/$/, ''),
      apiKey: apiKey,
      customModels,
      fetchedModels,
      createdAt: editingProfile?.createdAt || Date.now(),
      jsonSupport,
    };

    onSave(profile);

    if (setAsDefault) {
      settings.setDefaultProfile(profile.id);
    } else if (settings.apiSettings.defaultProfileId === profile.id) {
      settings.setDefaultProfile(undefined);
    }
  }

  async function handleDelete() {
    if (!editingProfile) return;

    const confirmed = await ask('Are you sure you want to delete this profile?', {
      title: 'Delete Profile',
      kind: 'warning',
    });

    if (confirmed) {
      await settings.deleteProfile(editingProfile.id);
      onClose();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    onclick={onClose}
    aria-modal="true"
    role="dialog"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="w-full max-w-lg bg-surface-900 border border-surface-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-700 px-5 py-4 bg-surface-800 rounded-t-xl shrink-0">
        <h2 class="text-lg font-semibold text-surface-100">{editingProfile ? 'Edit Profile' : 'New API Profile'}</h2>
        <button
          class="p-1.5 hover:bg-surface-700 text-surface-400 hover:text-surface-100 rounded-lg transition-colors"
          onclick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-6">
        <!-- Name -->
        <div class="space-y-2">
          <label for="profile-name" class="text-sm font-medium text-surface-300">Profile Name</label>
          <input
            id="profile-name"
            type="text"
            class="input w-full bg-surface-950 border-surface-700 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 text-surface-100"
            placeholder="e.g., OpenRouter, Local LLM"
            bind:value={name}
          />
          <label class="flex items-start gap-2 pt-1 cursor-pointer group">
            <input
              type="checkbox"
              bind:checked={setAsDefault}
              class="mt-1 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500/20"
            />
            <div class="text-xs">
              <span class="block text-surface-300 group-hover:text-surface-200 transition-colors">Set as System Default (Fallback)</span>
              <span class="block text-surface-500">Used for features that don't have a specific profile assigned</span>
            </div>
          </label>
        </div>

        <!-- Base URL -->
        <div class="space-y-2">
          <label for="profile-url" class="text-sm font-medium text-surface-300 flex items-center gap-2">
            <Globe size={14} />
            Base URL
          </label>

          <div class="flex flex-wrap gap-2 mb-2">
            {#each urlPresets as preset}
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                  {baseUrl === preset.url
                    ? 'bg-accent-600 text-white border-accent-500 shadow-sm'
                    : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200'}"
                onclick={() => handleSelectPreset(preset)}
              >
                {preset.name}
              </button>
            {/each}
          </div>

          <input
            id="profile-url"
            type="text"
            class="input w-full bg-surface-950 border-surface-700 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 text-surface-100 font-mono text-xs"
            placeholder="https://api.example.com/v1"
            bind:value={baseUrl}
          />
        </div>

        <!-- API Key -->
        <div class="space-y-2">
          <label for="profile-key" class="text-sm font-medium text-surface-300 flex items-center gap-2">
            <KeyIcon size={14} />
            API Key
          </label>
          <div class="relative">
            <input
              id="profile-key"
              type={showApiKey ? 'text' : 'password'}
              class="input w-full bg-surface-950 border-surface-700 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 text-surface-100 font-mono text-xs pr-16"
              placeholder="sk-..."
              bind:value={apiKey}
            />
            <button
              type="button"
              class="absolute right-1 top-1 bottom-1 px-3 text-xs font-medium text-surface-500 hover:text-surface-300 bg-surface-800/50 hover:bg-surface-800 rounded transition-colors"
              onclick={() => showApiKey = !showApiKey}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <!-- JSON Support Section -->
        <div class="space-y-2 pt-2 border-t border-surface-800">
          <label class="text-sm font-medium text-surface-300 flex items-center gap-2">
            <Code2 size={14} />
            JSON Support
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border
                {jsonSupport === 'none'
                  ? 'bg-surface-700 text-surface-100 border-surface-600 shadow-sm'
                  : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200'}"
              onclick={() => jsonSupport = 'none'}
            >
              None
            </button>
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border
                {jsonSupport === 'json_object'
                  ? 'bg-surface-700 text-surface-100 border-surface-600 shadow-sm'
                  : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200'}"
              onclick={() => jsonSupport = 'json_object'}
            >
              JSON Object
            </button>
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border
                {jsonSupport === 'json_schema'
                  ? 'bg-accent-600/20 text-accent-400 border-accent-600/30 shadow-sm'
                  : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200'}"
              onclick={() => jsonSupport = 'json_schema'}
            >
              JSON Schema
            </button>
          </div>
          <div class="text-xs text-surface-500 space-y-1">
            {#if jsonSupport === 'none'}
              <p>Use text-based JSON instructions in prompts. Compatible with all providers.</p>
            {:else if jsonSupport === 'json_object'}
              <p>Use basic JSON mode via <code class="bg-surface-800 px-1 rounded">response_format</code>. Better reliability, lower token cost.</p>
            {:else}
              <p>Use structured output with schema validation. Best reliability, lowest token cost. Requires provider support.</p>
            {/if}
          </div>
        </div>

        <!-- Models Section -->
        <div class="space-y-4 pt-2 border-t border-surface-800">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-surface-300 flex items-center gap-2">
              <Box size={14} />
              Models
            </label>
            <button
              type="button"
              class="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-2"
              onclick={handleFetchModels}
              disabled={isFetchingModels || !baseUrl}
            >
              <RefreshCw size={12} class={isFetchingModels ? 'animate-spin' : ''} />
              {isFetchingModels ? 'Fetching...' : 'Fetch Models'}
            </button>
          </div>

          {#if fetchError}
            <div class="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle size={14} class="shrink-0" />
              {fetchError}
            </div>
          {/if}

          <!-- Fetched Models -->
          {#if fetchedModels.length > 0}
            <div class="space-y-2">
              <div class="text-xs font-medium text-surface-500 uppercase tracking-wider">Fetched ({fetchedModels.length})</div>
              <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-surface-950/30 rounded-lg border border-surface-800">
                {#each fetchedModels as model, i (model + '-' + i)}
                  <div class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-surface-800 text-surface-300 rounded text-xs group hover:bg-surface-700 hover:text-surface-200 transition-colors">
                    <span class="truncate max-w-[180px]">{model}</span>
                    <button
                      type="button"
                      class="p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onclick={() => handleRemoveFetchedModel(model)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Custom Models -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-surface-500 uppercase tracking-wider">Custom Models</div>
            <div class="flex gap-2">
              <input
                type="text"
                class="input flex-1 bg-surface-950 border-surface-700 text-surface-100 text-xs h-9"
                placeholder="model-name or provider/model"
                bind:value={newModelInput}
                onkeydown={(e) => e.key === 'Enter' && handleAddCustomModel()}
              />
              <button
                type="button"
                class="btn btn-primary px-3 h-9 flex items-center justify-center"
                onclick={handleAddCustomModel}
                disabled={!newModelInput.trim()}
              >
                <Plus size={16} />
              </button>
            </div>

            {#if customModels.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each customModels as model, i (model + '-custom-' + i)}
                  <div class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-accent-600/10 border border-accent-600/20 text-accent-400 rounded text-xs group hover:bg-accent-600/20 transition-colors">
                    <span class="truncate max-w-[180px]">{model}</span>
                    <button
                      type="button"
                      class="p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      onclick={() => handleRemoveCustomModel(model)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-surface-700 p-5 bg-surface-800/50 rounded-b-xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
        {#if editingProfile && canDelete}
          <button
            type="button"
            class="px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2 font-medium"
            onclick={handleDelete}
          >
            <Trash2 size={16} />
            Delete Profile
          </button>
        {:else if isDefaultProfile}
          <span class="text-xs text-surface-500 italic hidden sm:inline">Default profile cannot be deleted</span>
        {:else}
          <div class="hidden sm:block"></div>
        {/if}

        <div class="flex gap-3 w-full sm:w-auto">
          <button
            type="button"
            class="px-4 py-2.5 rounded-lg border border-surface-600 bg-surface-800 text-surface-200 hover:bg-surface-700 hover:text-surface-100 font-medium transition-all duration-200 active:scale-[0.98] flex-1 sm:flex-none flex items-center justify-center shadow-sm"
            onclick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-6 py-2.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-semibold shadow-lg shadow-accent-600/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none flex-1 sm:flex-none flex items-center justify-center gap-2"
            onclick={handleSave}
            disabled={!name.trim() || !baseUrl.trim()}
          >
            {editingProfile ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* No custom styles, using Tailwind */
</style>
