<script lang="ts">
  import { settings } from '$lib/stores/settings.svelte';
  import { ChevronDown, Server, Plus } from 'lucide-svelte';

  interface Props {
    profileId: string | null;
    model: string;
    onProfileChange: (profileId: string | null) => void;
    onModelChange: (model: string) => void;
    showProfileSelector?: boolean;
    onManageProfiles?: () => void;
    label?: string;
    placeholder?: string;
  }

  let {
    profileId,
    model,
    onProfileChange,
    onModelChange,
    showProfileSelector = true,
    onManageProfiles,
    label = 'Model',
    placeholder = 'Select or type model...',
  }: Props = $props();

  // Local state for model search/input
  let modelSearch = $state(model || '');
  let showModelDropdown = $state(false);
  let inputRef = $state<HTMLInputElement | null>(null);
  let lastProfileId = $state(profileId);

  // Get available models for the selected profile
  let availableModels = $derived.by(() => {
    if (!profileId) return [];
    const profile = settings.getProfile(profileId);
    if (!profile) return [];
    // Combine fetched and custom models, removing duplicates
    return [...new Set([...profile.fetchedModels, ...profile.customModels])];
  });

  // Filter models based on search
  let filteredModels = $derived.by(() => {
    if (!modelSearch.trim()) return availableModels;
    const search = modelSearch.toLowerCase();
    return availableModels.filter(m => m.toLowerCase().includes(search));
  });

  // Get selected profile name
  let selectedProfileName = $derived.by(() => {
    if (!profileId) return 'None';
    const profile = settings.getProfile(profileId);
    return profile?.name || 'Unknown';
  });

  // Sync model search with model prop (only when dropdown is closed)
  $effect(() => {
    if (model !== modelSearch && !showModelDropdown) {
      modelSearch = model;
    }
  });

  // Handle profile changes - clear search and close dropdown
  $effect(() => {
    if (profileId !== lastProfileId) {
      lastProfileId = profileId;
      modelSearch = ''; // Clear search when profile changes
      showModelDropdown = false; // Close dropdown during transition
    }
  });

  function handleModelSelect(selectedModel: string) {
    modelSearch = selectedModel;
    onModelChange(selectedModel);
    showModelDropdown = false;
  }

  function handleModelInputChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    modelSearch = value;
  }

  function handleModelInputBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      showModelDropdown = false;
      // If the search value is different from model, update it
      if (modelSearch && modelSearch !== model) {
        onModelChange(modelSearch);
      }
    }, 200);
  }

  function handleModelInputFocus() {
    showModelDropdown = true;
  }

  function handleModelInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (modelSearch) {
        onModelChange(modelSearch);
      }
      showModelDropdown = false;
      inputRef?.blur();
    } else if (e.key === 'Escape') {
      showModelDropdown = false;
      inputRef?.blur();
    }
  }
</script>

<div class="model-selector">
  {#if showProfileSelector}
    <div class="profile-row">
      <label class="label">API Profile</label>
      <div class="profile-select-container">
        <select
          class="input profile-select"
          value={profileId || ''}
          onchange={(e) => {
            const value = e.currentTarget.value || null;
            onProfileChange(value);
          }}
        >
          <option value="">Select a profile...</option>
          {#each settings.apiSettings.profiles as profile}
            <option value={profile.id}>
              {profile.name}{settings.apiSettings.activeProfileId === profile.id ? ' (Active)' : ''}
            </option>
          {/each}
        </select>
        {#if onManageProfiles}
          <button
            type="button"
            class="manage-btn"
            onclick={onManageProfiles}
            title="Manage API Profiles"
          >
            <Server size={14} />
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="model-row">
    <label class="label">{label}</label>
    <div class="model-input-container">
      <input
        bind:this={inputRef}
        type="text"
        class="input model-input"
        {placeholder}
        value={modelSearch}
        oninput={handleModelInputChange}
        onfocus={handleModelInputFocus}
        onblur={handleModelInputBlur}
        onkeydown={handleModelInputKeyDown}
      />
      <button
        type="button"
        class="dropdown-toggle"
        onclick={() => {
          showModelDropdown = !showModelDropdown;
          if (showModelDropdown) inputRef?.focus();
        }}
        tabindex="-1"
      >
        <ChevronDown size={14} />
      </button>

      {#if showModelDropdown}
        <div class="model-dropdown">
          {#if availableModels.length === 0}
            <div class="dropdown-empty">No models in this profile. Type a model ID or add models to the profile.</div>
          {:else if filteredModels.length === 0}
            <div class="dropdown-empty">No matching models</div>
          {:else}
            {#each filteredModels as modelOption}
              <button
                type="button"
                class="dropdown-item"
                class:selected={modelOption === model}
                onmousedown={(e) => {
                  e.preventDefault();
                  handleModelSelect(modelOption);
                }}
              >
                {modelOption}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
    {#if availableModels.length === 0 && !showModelDropdown}
      <p class="hint">No models available. Add models to the profile or type a model ID.</p>
    {/if}
  </div>
</div>

<style>
  .model-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .profile-row,
  .model-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .profile-select-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .profile-select {
    flex: 1;
  }

  .manage-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .manage-btn:hover,
  .manage-btn:active {
    background: var(--surface-3);
    color: var(--text-primary);
  }

  .model-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .model-input {
    flex: 1;
    padding-right: 2rem;
  }

  .dropdown-toggle {
    position: absolute;
    right: 0.25rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.15s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .dropdown-toggle:hover,
  .dropdown-toggle:active {
    color: var(--text-primary);
  }

  .model-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: rgb(40, 40, 45);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 100;
    margin-top: 0.25rem;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.75rem;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s ease;
    min-height: 44px; /* Touch-friendly target size */
  }

  .dropdown-item:hover,
  .dropdown-item:active {
    background: rgb(55, 55, 60);
  }

  .dropdown-item.selected {
    background: var(--accent);
    color: var(--text-on-accent);
  }

  .dropdown-empty {
    padding: 0.75rem;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .hint {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 1rem; /* 16px prevents iOS zoom on focus */
    min-height: 44px; /* Touch-friendly target size */
  }

  .input:focus {
    outline: none;
    border-color: var(--accent);
  }

  @media (min-width: 640px) {
    .input {
      font-size: 0.875rem;
    }
  }
</style>
