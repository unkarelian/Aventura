<script lang="ts">
  import { settings } from '$lib/stores/settings.svelte';
  import type { APIProfile } from '$lib/types';
  import { X, Plus, Trash2, RefreshCw, Check, AlertCircle } from 'lucide-svelte';
  import { ask } from '@tauri-apps/plugin-dialog';
  import { fetch } from '@tauri-apps/plugin-http';

  // Check if the current profile can be deleted
  let canDelete = $derived(editingProfile ? settings.canDeleteProfile(editingProfile.id) : false);
  let isDefaultProfile = $derived(editingProfile?.id === settings.getDefaultProfileIdForProvider());

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

  // Form state
  let name = $state('');
  let baseUrl = $state('');
  let apiKey = $state('');
  let customModels = $state<string[]>([]);
  let fetchedModels = $state<string[]>([]);
  let newModelInput = $state('');

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
      } else {
        // Reset form for new profile - start with empty fields
        name = '';
        baseUrl = settings.apiSettings.openaiApiURL;
        apiKey = '';  // API keys are not shared between profiles
        customModels = [];
        fetchedModels = [];
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
    };

    onSave(profile);
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
  <div class="modal-backdrop" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>{editingProfile ? 'Edit Profile' : 'New API Profile'}</h2>
        <button class="close-btn" onclick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Name -->
        <div class="form-group">
          <label for="profile-name">Profile Name</label>
          <input
            id="profile-name"
            type="text"
            class="input"
            placeholder="e.g., OpenRouter, Local LLM"
            bind:value={name}
          />
        </div>

        <!-- Base URL with presets -->
        <div class="form-group">
          <label for="profile-url">Base URL</label>
          <div class="presets">
            {#each urlPresets as preset}
              <button
                type="button"
                class="preset-btn"
                class:active={baseUrl === preset.url}
                onclick={() => handleSelectPreset(preset)}
              >
                {preset.name}
              </button>
            {/each}
          </div>
          <input
            id="profile-url"
            type="text"
            class="input"
            placeholder="https://api.example.com/v1"
            bind:value={baseUrl}
          />
        </div>

        <!-- API Key -->
        <div class="form-group">
          <label for="profile-key">API Key</label>
          <div class="api-key-container">
            <input
              id="profile-key"
              type={showApiKey ? 'text' : 'password'}
              class="input"
              placeholder="sk-..."
              bind:value={apiKey}
            />
            <button
              type="button"
              class="toggle-key-btn"
              onclick={() => showApiKey = !showApiKey}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <!-- Models Section -->
        <div class="form-group">
          <div class="models-header">
            <label>Models</label>
            <button
              type="button"
              class="fetch-btn"
              onclick={handleFetchModels}
              disabled={isFetchingModels || !baseUrl}
            >
              <RefreshCw size={14} class={isFetchingModels ? 'spinning' : ''} />
              {isFetchingModels ? 'Fetching...' : 'Fetch Models'}
            </button>
          </div>

          {#if fetchError}
            <div class="error-message">
              <AlertCircle size={14} />
              {fetchError}
            </div>
          {/if}

          <!-- Fetched Models -->
          {#if fetchedModels.length > 0}
            <div class="models-section">
              <span class="models-label">Fetched ({fetchedModels.length})</span>
              <div class="models-list">
                {#each fetchedModels as model, i (model + '-' + i)}
                  <div class="model-tag">
                    <span>{model}</span>
                    <button
                      type="button"
                      class="remove-model-btn"
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
          <div class="models-section">
            <span class="models-label">Custom Models</span>
            <div class="add-model-row">
              <input
                type="text"
                class="input"
                placeholder="model-name or provider/model"
                bind:value={newModelInput}
                onkeydown={(e) => e.key === 'Enter' && handleAddCustomModel()}
              />
              <button
                type="button"
                class="add-model-btn"
                onclick={handleAddCustomModel}
                disabled={!newModelInput.trim()}
              >
                <Plus size={14} />
              </button>
            </div>
            {#if customModels.length > 0}
              <div class="models-list">
                {#each customModels as model, i (model + '-custom-' + i)}
                  <div class="model-tag custom">
                    <span>{model}</span>
                    <button
                      type="button"
                      class="remove-model-btn"
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

      <div class="modal-footer">
        {#if editingProfile && canDelete}
          <button type="button" class="btn btn-danger" onclick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        {:else if isDefaultProfile}
          <span class="text-xs text-surface-500 italic">Default profile cannot be deleted</span>
        {/if}
        <div class="footer-actions">
          <button type="button" class="btn btn-secondary" onclick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            onclick={handleSave}
            disabled={!name.trim() || !baseUrl.trim()}
          >
            <Check size={14} />
            {editingProfile ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: rgb(30, 30, 35);
    border: 1px solid rgb(60, 60, 70);
    border-radius: 0.5rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background: var(--surface-2);
    color: var(--text-primary);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group > label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .preset-btn {
    padding: 0.5rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: 44px; /* Touch-friendly target size */
    display: flex;
    align-items: center;
  }

  .preset-btn:hover {
    background: var(--surface-3);
    color: var(--text-primary);
  }

  .preset-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--text-on-accent);
  }

  .api-key-container {
    display: flex;
    gap: 0.5rem;
  }

  .api-key-container .input {
    flex: 1;
  }

  .toggle-key-btn {
    padding: 0.5rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .toggle-key-btn:hover {
    background: var(--surface-3);
    color: var(--text-primary);
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .checkbox-label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent);
  }

  .models-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .models-header label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .fetch-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .fetch-btn:hover:not(:disabled) {
    background: var(--surface-3);
    color: var(--text-primary);
  }

  .fetch-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.375rem;
    color: #ef4444;
    font-size: 0.75rem;
  }

  .models-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .models-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .add-model-row {
    display: flex;
    gap: 0.5rem;
  }

  .add-model-row .input {
    flex: 1;
  }

  .add-model-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--accent);
    border: none;
    border-radius: 0.375rem;
    color: var(--text-on-accent);
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .add-model-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .add-model-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .models-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    max-height: 150px;
    overflow-y: auto;
    padding: 0.5rem;
    background: var(--surface-2);
    border-radius: 0.375rem;
  }

  .model-tag {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--surface-3);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-primary);
  }

  .model-tag.custom {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .remove-model-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 0.125rem;
    transition: all 0.15s ease;
  }

  .remove-model-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .modal-footer {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  @media (min-width: 400px) {
    .modal-footer {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
  }

  .footer-actions {
    display: flex;
    gap: 0.75rem;
    width: 100%;
  }

  @media (min-width: 400px) {
    .footer-actions {
      width: auto;
      margin-left: auto;
    }
  }

  .footer-actions .btn {
    flex: 1;
  }

  @media (min-width: 400px) {
    .footer-actions .btn {
      flex: none;
    }
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-primary {
    background: var(--accent);
    border: none;
    color: var(--text-on-accent);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--surface-3);
  }

  .btn-danger {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>
