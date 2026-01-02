<script lang="ts">
  import { grammarService, type GrammarIssue } from '$lib/services/grammar';
  import { AlertCircle, Check, X, Plus } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  interface Props {
    text: string;
    onApplySuggestion: (newText: string) => void;
  }

  let { text, onApplySuggestion }: Props = $props();

  let issues = $state<GrammarIssue[]>([]);
  let checking = $state(false);
  let expandedIssue = $state<number | null>(null);
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debounced lint check
  $effect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    if (!text.trim()) {
      issues = [];
      return;
    }

    debounceTimeout = setTimeout(async () => {
      checking = true;
      try {
        issues = await grammarService.lint(text);
      } finally {
        checking = false;
      }
    }, 500);

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  });

  function handleApplySuggestion(issue: GrammarIssue, suggestionIndex: number) {
    const suggestion = issue.suggestions[suggestionIndex];
    if (suggestion === undefined) return;

    const before = text.slice(0, issue.start);
    const after = text.slice(issue.end);
    const newText = before + suggestion + after;
    onApplySuggestion(newText);
    expandedIssue = null;
  }

  async function handleAddToDictionary(issue: GrammarIssue) {
    await grammarService.addWord(issue.problemText);
    // Re-lint to remove the issue
    issues = await grammarService.lint(text);
    expandedIssue = null;
  }

  function handleDismiss(index: number) {
    issues = issues.filter((_, i) => i !== index);
    expandedIssue = null;
  }

  function toggleIssue(index: number) {
    expandedIssue = expandedIssue === index ? null : index;
  }
</script>

{#if issues.length > 0}
  <div class="space-y-1.5" transition:slide={{ duration: 150 }}>
    {#each issues as issue, index (issue.start + '-' + issue.end)}
      <div
        class="rounded-lg bg-yellow-900/20 border border-yellow-700/40 overflow-hidden"
        transition:slide={{ duration: 150 }}
      >
        <!-- Issue header -->
        <div
          class="w-full flex items-start gap-2 p-2 sm:p-2 text-left hover:bg-yellow-900/10 active:bg-yellow-900/20 transition-colors cursor-pointer"
          onclick={() => toggleIssue(index)}
          onkeydown={(e) => e.key === 'Enter' && toggleIssue(index)}
          role="button"
          tabindex="0"
        >
          <AlertCircle class="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span class="text-[10px] sm:text-xs font-medium text-yellow-400 bg-yellow-900/40 px-1.5 py-0.5 rounded">
                {issue.kind}
              </span>
              <span class="text-[10px] sm:text-xs text-yellow-300/80 truncate max-w-[150px] sm:max-w-none">
                "{issue.problemText}"
              </span>
            </div>
            <p class="text-[10px] sm:text-xs text-yellow-200/70 mt-0.5 line-clamp-2 sm:line-clamp-1">
              {issue.message}
            </p>
          </div>
          <button
            class="p-1.5 -m-0.5 rounded hover:bg-yellow-800/30 active:bg-yellow-800/50 text-yellow-500/60 hover:text-yellow-400 shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
            onclick={(e) => { e.stopPropagation(); handleDismiss(index); }}
            title="Dismiss"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Expanded content with suggestions -->
        {#if expandedIssue === index}
          <div class="px-2 pb-2 pt-1.5 border-t border-yellow-700/30" transition:slide={{ duration: 150 }}>
            {#if issue.suggestions.length > 0}
              <div class="flex flex-wrap gap-1.5 sm:gap-2">
                {#each issue.suggestions.slice(0, 5) as suggestion, suggestionIndex}
                  <button
                    class="flex items-center gap-1 px-2 py-1.5 text-[11px] sm:text-xs rounded bg-green-900/30 border border-green-700/40 text-green-300 hover:bg-green-900/50 active:bg-green-900/60 transition-colors min-h-[32px]"
                    onclick={() => handleApplySuggestion(issue, suggestionIndex)}
                  >
                    <Check class="h-3 w-3 shrink-0" />
                    <span class="truncate max-w-[120px] sm:max-w-none">{suggestion || '(remove)'}</span>
                  </button>
                {/each}
                {#if issue.kind.toLowerCase().includes('spell')}
                  <button
                    class="flex items-center gap-1 px-2 py-1.5 text-[11px] sm:text-xs rounded bg-surface-700 border border-surface-600 text-surface-300 hover:bg-surface-600 active:bg-surface-500 transition-colors min-h-[32px]"
                    onclick={() => handleAddToDictionary(issue)}
                    title="Add to dictionary"
                  >
                    <Plus class="h-3 w-3 shrink-0" />
                    <span class="whitespace-nowrap">Add to dictionary</span>
                  </button>
                {/if}
              </div>
            {:else}
              <p class="text-xs text-yellow-400/60 italic">No suggestions available</p>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
