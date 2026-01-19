<script lang="ts">
  import {
    Wand2,
    Rocket,
    Building,
    Skull,
    Search,
    Heart,
    Sparkles,
  } from "lucide-svelte";
  import type { Genre, GenreOption } from "../wizardTypes";

  interface Props {
    selectedGenre: Genre;
    customGenre: string;
    onGenreChange: (genre: Genre) => void;
    onCustomGenreChange: (value: string) => void;
  }

  let { selectedGenre, customGenre, onGenreChange, onCustomGenreChange }: Props = $props();

  // Genre options with icons
  const genres: GenreOption[] = [
    {
      id: "fantasy",
      name: "Fantasy",
      icon: Wand2,
      description: "Magic, quests, and mythical creatures",
    },
    {
      id: "scifi",
      name: "Sci-Fi",
      icon: Rocket,
      description: "Space, technology, and the future",
    },
    {
      id: "modern",
      name: "Modern",
      icon: Building,
      description: "Contemporary realistic settings",
    },
    {
      id: "horror",
      name: "Horror",
      icon: Skull,
      description: "Fear, suspense, and the unknown",
    },
    {
      id: "mystery",
      name: "Mystery",
      icon: Search,
      description: "Puzzles, clues, and investigations",
    },
    {
      id: "romance",
      name: "Romance",
      icon: Heart,
      description: "Love, relationships, and emotion",
    },
    {
      id: "custom",
      name: "Custom",
      icon: Sparkles,
      description: "Define your own genre",
    },
  ];
</script>

<div class="space-y-4">
  <p class="text-surface-400">
    What kind of story do you want to tell?
  </p>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each genres as genre}
      {@const Icon = genre.icon}
      <button
        class="card p-4 text-left transition-all hover:border-accent-500/50"
        class:ring-2={selectedGenre === genre.id}
        class:ring-accent-500={selectedGenre === genre.id}
        onclick={() => onGenreChange(genre.id)}
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="rounded-lg bg-surface-700 p-2">
            <Icon class="h-5 w-5 text-accent-400" />
          </div>
          <span class="font-medium text-surface-100">{genre.name}</span>
        </div>
        <p class="text-xs text-surface-400">{genre.description}</p>
      </button>
    {/each}
  </div>
  {#if selectedGenre === "custom"}
    <div class="mt-4">
      <label class="mb-2 block text-sm font-medium text-surface-300">
        Describe your genre
      </label>
      <input
        type="text"
        value={customGenre}
        oninput={(e) => onCustomGenreChange(e.currentTarget.value)}
        placeholder="e.g., Steampunk Western, Cosmic Horror, Slice-of-Life Fantasy..."
        class="input"
      />
    </div>
  {/if}
</div>
