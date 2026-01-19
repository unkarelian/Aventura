<script lang="ts">
  import { lorebookVault } from "$lib/stores/lorebookVault.svelte";
  import type { VaultLorebook } from "$lib/types";
  import { X, Search, Archive, Loader2 } from "lucide-svelte";
  import VaultLorebookCard from "./VaultLorebookCard.svelte";

  interface Props {
    onSelect: (lorebook: VaultLorebook) => void;
    onClose: () => void;
  }

  let { onSelect, onClose }: Props = $props();

  let searchQuery = $state("");

  const filteredLorebooks = $derived.by(() => {
    let books = lorebookVault.lorebooks;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      books = books.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query) ||
          b.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Sort favorites first, then updated
    // Use spread to create a copy before sorting to avoid mutating the $state array
    return [...books].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  $effect(() => {
    if (!lorebookVault.isLoaded) {
      lorebookVault.load();
    }
  });

  function handleSelect(lorebook: VaultLorebook) {
    onSelect(lorebook);
  }
</script>

<!-- Modal backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg bg-surface-800 shadow-xl"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-surface-700 p-4"
    >
      <div class="flex items-center gap-2">
        <Archive class="h-5 w-5 text-accent-400" />
        <h2 class="text-lg font-semibold text-surface-100">
          Select Lorebook from Vault
        </h2>
      </div>
      <button class="rounded p-1.5 hover:bg-surface-700" onclick={onClose}>
        <X class="h-5 w-5 text-surface-400" />
      </button>
    </div>

    <!-- Search -->
    <div class="border-b border-surface-700 p-4">
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search lorebooks..."
          class="w-full rounded-lg border border-surface-600 bg-surface-700 pl-10 pr-3 py-2 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- Lorebook List -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if !lorebookVault.isLoaded}
        <div class="flex h-40 items-center justify-center">
          <Loader2 class="h-8 w-8 animate-spin text-surface-500" />
        </div>
      {:else if filteredLorebooks.length === 0}
        <div class="flex h-40 items-center justify-center">
          <div class="text-center">
            <Archive class="mx-auto h-10 w-10 text-surface-600" />
            <p class="mt-2 text-surface-400">
              {#if searchQuery}
                No lorebooks match your search
              {:else}
                No lorebooks in vault
              {/if}
            </p>
            <p class="mt-1 text-sm text-surface-500">
              Save processed lorebooks from the Import Wizard or Stories
            </p>
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {#each filteredLorebooks as lorebook (lorebook.id)}
            <VaultLorebookCard
              {lorebook}
              selectable
              onSelect={() => handleSelect(lorebook)}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="border-t border-surface-700 p-4 flex justify-end">
      <button
        class="rounded-lg px-4 py-2 text-sm text-surface-400 hover:text-surface-200"
        onclick={onClose}
      >
        Cancel
      </button>
    </div>
  </div>
</div>
