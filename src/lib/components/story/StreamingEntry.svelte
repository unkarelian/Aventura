<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { BookOpen } from 'lucide-svelte';
  import { parseMarkdown } from '$lib/utils/markdown';

  // Reactive binding to streaming content
  let content = $derived(ui.streamingContent);
  let renderedContent = $derived(parseMarkdown(content));
</script>

<div class="rounded-lg border-l-4 border-l-accent-500 bg-accent-500/5 p-4 animate-fade-in">
  <div class="flex items-start gap-3">
    <div class="mt-0.5 rounded-full bg-surface-700 p-1.5">
      <BookOpen class="h-4 w-4 text-accent-400 animate-pulse" />
    </div>
    <div class="flex-1">
      <div class="story-text prose-content streaming-content">
        {@html renderedContent}<span class="streaming-cursor"></span>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }

  /* Streaming cursor that appears inline after the last content */
  .streaming-cursor {
    display: inline-block;
    width: 0.5rem;
    height: 1rem;
    margin-left: 0.125rem;
    background-color: var(--color-accent-400, #60a5fa);
    animation: blink 1s infinite;
    vertical-align: text-bottom;
  }

  /* Ensure the cursor appears after the last element in streaming content */
  :global(.streaming-content > *:last-child) {
    display: inline;
  }
</style>
