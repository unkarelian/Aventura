<script lang="ts">
  import { ui, type DebugLogEntry } from '$lib/stores/ui.svelte';
  import { X, ArrowUpCircle, ArrowDownCircle, Trash2, Copy, Check, WrapText } from 'lucide-svelte';

  let copiedId = $state<string | null>(null);
  let renderNewlines = $state(false);

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  function formatDuration(duration: number | undefined): string {
    if (duration === undefined) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  }

  function formatJson(data: Record<string, unknown>): string {
    try {
      let json = JSON.stringify(data, null, 2);
      if (renderNewlines) {
        // Replace escaped newlines with actual newlines in string values
        json = json.replace(/\\n/g, '\n');
      }
      return json;
    } catch {
      return String(data);
    }
  }

  async function copyToClipboard(entry: DebugLogEntry) {
    try {
      const text = formatJson(entry.data);
      await navigator.clipboard.writeText(text);
      copiedId = entry.id;
      setTimeout(() => {
        if (copiedId === entry.id) copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  function handleClearLogs() {
    ui.clearDebugLogs();
  }

  // Group logs by request/response pairs
  let groupedLogs = $derived.by(() => {
    const logs = ui.debugLogs;
    const groups: { request?: DebugLogEntry; response?: DebugLogEntry }[] = [];
    const requestMap = new Map<string, number>(); // Map request ID to group index

    for (const log of logs) {
      if (log.type === 'request') {
        groups.push({ request: log });
        requestMap.set(log.id, groups.length - 1);
      } else {
        // Try to find matching request
        const requestId = log.id.replace('-response', '');
        const groupIndex = requestMap.get(requestId);
        if (groupIndex !== undefined) {
          groups[groupIndex].response = log;
        } else {
          // Orphan response, add as its own group
          groups.push({ response: log });
        }
      }
    }

    return groups.reverse(); // Show newest first
  });
</script>

{#if ui.debugModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    onclick={() => ui.closeDebugModal()}
    onkeydown={(e) => e.key === 'Escape' && ui.closeDebugModal()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="card w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="document"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-700 pb-4 flex-shrink-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold text-surface-100">API Debug Logs</h2>
          <span class="text-xs px-2 py-0.5 rounded bg-surface-700 text-surface-400">
            {ui.debugLogs.length} entries
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn-ghost rounded-lg p-2 {renderNewlines ? 'text-blue-400' : 'text-surface-400 hover:text-surface-200'}"
            onclick={() => renderNewlines = !renderNewlines}
            title={renderNewlines ? 'Show escaped newlines (\\n)' : 'Render newlines as line breaks'}
          >
            <WrapText class="h-4 w-4" />
          </button>
          <button
            class="btn-ghost rounded-lg p-2 text-surface-400 hover:text-red-400"
            onclick={handleClearLogs}
            title="Clear all logs"
          >
            <Trash2 class="h-4 w-4" />
          </button>
          <button class="btn-ghost rounded-lg p-2" onclick={() => ui.closeDebugModal()}>
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto py-4">
        {#if groupedLogs.length === 0}
          <p class="text-center text-surface-400 py-8">
            No API requests logged yet. Make a request while debug mode is enabled to see logs here.
          </p>
        {:else}
          <div class="space-y-4">
            {#each groupedLogs as group, i}
              <div class="border border-surface-700 rounded-lg overflow-hidden">
                <!-- Request -->
                {#if group.request}
                  <div class="bg-surface-800/50">
                    <div class="flex items-center justify-between px-4 py-2 border-b border-surface-700">
                      <div class="flex items-center gap-2">
                        <ArrowUpCircle class="h-4 w-4 text-blue-400" />
                        <span class="text-sm font-medium text-blue-400">Request</span>
                        <span class="text-xs text-surface-500">{group.request.serviceName}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-surface-500">
                          {formatTimestamp(group.request.timestamp)}
                        </span>
                        <button
                          class="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                          onclick={() => copyToClipboard(group.request!)}
                          title="Copy JSON"
                        >
                          {#if copiedId === group.request.id}
                            <Check class="h-3.5 w-3.5 text-green-400" />
                          {:else}
                            <Copy class="h-3.5 w-3.5" />
                          {/if}
                        </button>
                      </div>
                    </div>
                    <pre class="p-3 text-xs text-surface-300 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap bg-surface-900/50">{formatJson(group.request.data)}</pre>
                  </div>
                {/if}

                <!-- Response -->
                {#if group.response}
                  <div class="bg-surface-800/30">
                    <div class="flex items-center justify-between px-4 py-2 border-b border-surface-700">
                      <div class="flex items-center gap-2">
                        <span class={group.response.error ? 'text-red-400' : 'text-green-400'}>
                          <ArrowDownCircle class="h-4 w-4" />
                        </span>
                        <span class="text-sm font-medium {group.response.error ? 'text-red-400' : 'text-green-400'}">
                          {group.response.error ? 'Error' : 'Response'}
                        </span>
                        {#if group.response.duration}
                          <span class="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">
                            {formatDuration(group.response.duration)}
                          </span>
                        {/if}
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-surface-500">
                          {formatTimestamp(group.response.timestamp)}
                        </span>
                        <button
                          class="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                          onclick={() => copyToClipboard(group.response!)}
                          title="Copy JSON"
                        >
                          {#if copiedId === group.response.id}
                            <Check class="h-3.5 w-3.5 text-green-400" />
                          {:else}
                            <Copy class="h-3.5 w-3.5" />
                          {/if}
                        </button>
                      </div>
                    </div>
                    <pre class="p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap bg-surface-900/50" class:text-surface-300={!group.response.error} class:text-red-300={group.response.error}>{formatJson(group.response.data)}</pre>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-surface-700 pt-3 flex-shrink-0">
        <p class="text-xs text-surface-500 text-center">
          Logs are stored in memory only and will be cleared when you close the app.
        </p>
      </div>
    </div>
  </div>
{/if}
