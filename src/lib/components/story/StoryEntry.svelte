<script lang="ts">
  import type { StoryEntry } from '$lib/types';
  import { story } from '$lib/stores/story.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { User, BookOpen, Info, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-svelte';
  import { parseMarkdown } from '$lib/utils/markdown';

  let { entry }: { entry: StoryEntry } = $props();

  // Check if this entry is an error entry (either tracked or detected by content)
  const isErrorEntry = $derived(
    entry.type === 'system' && (
      ui.lastGenerationError?.errorEntryId === entry.id ||
      entry.content.toLowerCase().includes('generation failed') ||
      entry.content.toLowerCase().includes('failed to generate') ||
      entry.content.toLowerCase().includes('empty response')
    )
  );

  /**
   * Retry generation for this error entry.
   * For tracked errors, uses the UI callback. For legacy errors, finds the previous user action.
   */
  async function handleRetryFromEntry() {
    console.log('[StoryEntry] handleRetryFromEntry called', { entryId: entry.id, isGenerating: ui.isGenerating });

    if (ui.isGenerating) {
      console.log('[StoryEntry] Already generating, returning');
      return;
    }

    // If this is the currently tracked error, use the standard retry
    if (ui.lastGenerationError?.errorEntryId === entry.id) {
      console.log('[StoryEntry] Using tracked error retry');
      await ui.triggerRetry();
      return;
    }

    // For legacy/untracked errors, find the previous user action and set up retry
    console.log('[StoryEntry] Legacy error, finding previous user action');
    const entryIndex = story.entries.findIndex(e => e.id === entry.id);
    if (entryIndex <= 0) {
      console.log('[StoryEntry] Entry not found or is first entry');
      return;
    }

    // Find the most recent user action before this error
    let userActionEntry = null;
    for (let i = entryIndex - 1; i >= 0; i--) {
      if (story.entries[i].type === 'user_action') {
        userActionEntry = story.entries[i];
        break;
      }
    }

    if (!userActionEntry) {
      console.log('[StoryEntry] No user action found before error');
      return;
    }

    console.log('[StoryEntry] Found user action', { userActionId: userActionEntry.id });

    // Set up the error state so the retry callback can handle it
    ui.setGenerationError({
      message: entry.content,
      errorEntryId: entry.id,
      userActionEntryId: userActionEntry.id,
      timestamp: Date.now(),
    });

    console.log('[StoryEntry] Error state set, triggering retry');
    // Trigger the retry
    await ui.triggerRetry();
    console.log('[StoryEntry] Retry complete');
  }

  let isEditing = $state(false);
  let editContent = $state('');
  let isDeleting = $state(false);

  const icons = {
    user_action: User,
    narration: BookOpen,
    system: Info,
    retry: BookOpen,
  };

  const styles = {
    user_action: 'border-l-accent-500 bg-accent-500/5',
    narration: 'border-l-surface-600 bg-surface-800/50',
    system: 'border-l-surface-500 bg-surface-800/30 italic text-surface-400',
    retry: 'border-l-amber-500 bg-amber-500/5',
  };

  const Icon = $derived(icons[entry.type]);

  function startEdit() {
    editContent = entry.content;
    isEditing = true;
  }

  async function saveEdit() {
    if (editContent.trim() && editContent !== entry.content) {
      await story.updateEntry(entry.id, editContent.trim());
    }
    isEditing = false;
  }

  function cancelEdit() {
    isEditing = false;
    editContent = '';
  }

  async function confirmDelete() {
    await story.deleteEntry(entry.id);
    isDeleting = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancelEdit();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      saveEdit();
    }
  }
</script>

<div class="group rounded-lg border-l-4 p-4 {styles[entry.type]} relative">
  <div class="flex items-start gap-3">
    <div class="mt-0.5 rounded-full bg-surface-700 p-1.5">
      <Icon class="h-4 w-4 text-surface-400" />
    </div>
    <div class="flex-1">
      {#if entry.type === 'user_action'}
        <p class="user-action mb-1 text-sm font-medium">You</p>
      {/if}

      {#if isEditing}
        <div class="space-y-2">
          <textarea
            bind:value={editContent}
            onkeydown={handleKeydown}
            class="input min-h-[100px] w-full resize-y text-sm"
            rows="4"
          ></textarea>
          <div class="flex gap-2">
            <button
              onclick={saveEdit}
              class="btn btn-primary flex items-center gap-1 text-xs"
            >
              <Check class="h-3 w-3" />
              Save
            </button>
            <button
              onclick={cancelEdit}
              class="btn btn-secondary flex items-center gap-1 text-xs"
            >
              <X class="h-3 w-3" />
              Cancel
            </button>
          </div>
          <p class="text-xs text-surface-500">Ctrl+Enter to save, Esc to cancel</p>
        </div>
      {:else if isDeleting}
        <div class="space-y-2">
          <p class="text-sm text-surface-300">Delete this entry?</p>
          <div class="flex gap-2">
            <button
              onclick={confirmDelete}
              class="btn flex items-center gap-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Trash2 class="h-3 w-3" />
              Delete
            </button>
            <button
              onclick={() => isDeleting = false}
              class="btn btn-secondary flex items-center gap-1 text-xs"
            >
              <X class="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <div class="story-text prose-content">
          {@html parseMarkdown(entry.content)}
        </div>
        {#if isErrorEntry}
          <button
            onclick={handleRetryFromEntry}
            disabled={ui.isGenerating}
            class="mt-3 btn flex items-center gap-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
          >
            <RefreshCw class="h-4 w-4" />
            Retry
          </button>
        {/if}
        {#if entry.metadata?.tokenCount}
          <p class="mt-2 text-xs text-surface-500">
            {entry.metadata.tokenCount} tokens
          </p>
        {/if}
      {/if}
    </div>

    <!-- Edit/Delete buttons (shown on hover) -->
    {#if !isEditing && !isDeleting && entry.type !== 'system'}
      <div class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onclick={startEdit}
          class="rounded p-1.5 text-surface-400 hover:bg-surface-600 hover:text-surface-200"
          title="Edit entry"
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
        <button
          onclick={() => isDeleting = true}
          class="rounded p-1.5 text-surface-400 hover:bg-red-500/20 hover:text-red-400"
          title="Delete entry"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    {/if}
  </div>
</div>
