# AGENTS.md

This file contains guidelines for agentic coding assistants working on the Aventura codebase.

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server (Vite)

# Type Checking
npm run check           # Run svelte-check (type checking)
npm run check:watch     # Watch mode type checking

# Production Build
npm run build           # Build for production
npm run preview         # Preview production build

# Tauri (desktop app)
npm run tauri          # Tauri CLI commands

# Running specific checks
npx svelte-check --tsconfig ./tsconfig.json    # Direct type check
```

**Note**: No test suite is currently configured. When adding tests, update this file.

## Project Architecture

- **Framework**: SvelteKit 2 + Tauri 2 (desktop app)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Svelte 5 runes ($state, $derived, $effect)
- **Database**: SQLite via @tauri-apps/plugin-sql
- **AI Integration**: OpenAI-compatible APIs (OpenRouter, custom providers)

## Code Style Guidelines

### File Organization

```
src/
├── routes/           # SvelteKit pages (use +page.svelte, +layout.svelte)
├── lib/
│   ├── components/   # Svelte components (PascalCase.svelte)
│   ├── services/     # Business logic classes (PascalCase.ts)
│   ├── stores/       # Svelte stores (*.svelte.ts for runes)
│   ├── types/       # TypeScript types (index.ts)
│   └── utils/       # Utility functions (camelCase.ts)
```

### Naming Conventions

- **Components**: `PascalCase.svelte` (e.g., `StoryView.svelte`)
- **Services/Classes**: `PascalCase.ts` (e.g., `AIService.ts`)
- **Functions/Methods**: `camelCase` (e.g., `generateResponse()`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_MEMORY_CONFIG`)
- **Types/Interfaces**: `PascalCase` (e.g., `interface Story`, `type StoryMode`)
- **Variables**: `camelCase` (e.g., `currentStory`, `isLoading`)
- **Event handlers**: `handle<Action>` (e.g., `handleSubmit`, `handleScroll`)

### Imports and Type Imports

```typescript
// Type imports use 'type' keyword
import type { Story, StoryEntry } from '$lib/types';
import { settings } from '$lib/stores/settings.svelte';

// Non-type imports
import { marked } from 'marked';
```

Use `$lib` alias for src/lib imports. Always use `type` keyword for type-only imports.

### Svelte Component Patterns

```typescript
<script lang="ts">
  // Imports at top
  import { story } from '$lib/stores/story.svelte';

  // Props destructured with TypeScript types
  interface Props {
    entry: StoryEntry;
    onAction?: () => void;
  }

  let { entry, onAction }: Props = $props();

  // Local state with Svelte 5 runes
  let isOpen = $state(false);

  // Computed values
  const isActive = $derived(entry.status === 'active');

  // Effects (cleanup via returned function)
  $effect(() => {
    // React to changes
    return () => {
      // Cleanup
    };
  });

  // Event handlers
  function handleClick() {
    isOpen = !isOpen;
  }
</script>

<!-- HTML with Tailwind classes -->
<button onclick={handleClick}>
  {entry.content}
</button>

{#if isOpen}
  <Modal onclose={() => isOpen = false} />
{/if}
```

### TypeScript Patterns

- **Strict mode enabled**: All code must be type-safe
- **Interfaces over types**: Use `interface` for object shapes, `type` for unions
- **Optional chaining**: Use `?.` for safe property access
- **Nullish coalescing**: Use `??` for fallbacks

```typescript
// Async functions with proper error handling
async function loadStory(storyId: string): Promise<void> {
  try {
    const story = await database.getStory(storyId);
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }
    this.currentStory = story;
  } catch (error) {
    console.error('[StoryStore] Failed to load story:', error);
    throw error;
  }
}

// Type guards for runtime checks
function isValidEntry(entry: any): entry is StoryEntry {
  return entry && typeof entry.content === 'string' && typeof entry.type === 'string';
}
```

### Error Handling

- **Logging**: Use consistent prefix pattern for console logs

```typescript
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[FeatureName]', ...args);
  }
}

// Always validate before operations
if (!this.currentStory) {
  throw new Error('No story loaded');
}
```

- **Error messages**: Descriptive with context (include IDs, names, etc.)

### State Management

Svelte 5 runes are used for reactive state:

```typescript
// Class-based store pattern
class StoryStore {
  currentStory = $state<Story | null>(null);
  entries = $state<StoryEntry[]>([]);

  // Computed properties (getters)
  get activeCharacters(): Character[] {
    return this.characters.filter(c => c.status === 'active');
  }

  // Methods update state immutably
  async addEntry(content: string): Promise<void> {
    const entry = await database.addEntry({ content });
    this.entries = [...this.entries, entry]; // Spread for immutability
  }
}

export const story = new StoryStore();
```

### Service Classes

Services encapsulate business logic and external API interactions:

```typescript
class AIService {
  private getProvider() {
    const apiSettings = settings.getApiSettingsForProfile(profileId);
    if (!apiSettings.openaiApiKey) {
      throw new Error(`No API key configured`);
    }
    return new OpenAIProvider(apiSettings);
  }

  async generateResponse(context: Context): Promise<string> {
    // Implementation
  }
}

export const aiService = new AIService();
```

### Database Operations

Use the database service for all data persistence:

```typescript
// Parallel queries for performance
const [entries, characters, locations] = await Promise.all([
  database.getStoryEntries(storyId),
  database.getCharacters(storyId),
  database.getLocations(storyId),
]);

// CRUD operations with state updates
async updateCharacter(id: string, updates: Partial<Character>): Promise<void> {
  await database.updateCharacter(id, updates);
  this.characters = this.characters.map(c =>
    c.id === id ? { ...c, ...updates } : c
  );
}
```

### JSDoc Comments

Add JSDoc for complex functions, not simple getters:

```typescript
/**
 * Generate a summary and metadata for a chapter.
 * @param entries - The entries to summarize
 * @param previousChapters - Previous chapter summaries for context (optional)
 * @returns ChapterSummary with summary text and metadata
 */
async summarizeChapter(
  entries: StoryEntry[],
  previousChapters?: Chapter[]
): Promise<ChapterSummary> {
  // Implementation
}
```

### Tailwind CSS

- Use responsive classes: `sm:`, `md:`, `lg:` prefixes
- Dark mode with `surface-*` tokens (custom design system)
- Flexbox/Grid layouts preferred
- Spacing: `p-3 sm:p-4`, `space-y-3 sm:space-y-4`
- Mobile-safe areas: `pb-safe` for iOS bottom notch

```html
<div class="flex h-full flex-col">
  <div class="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
    {#each items as item (item.id)}
      <div class="mb-3">{item.name}</div>
    {/each}
  </div>
</div>
```

### Event Patterns

- Custom events via callbacks: `onConfirm={() => ...}`
- DOM events: `onclick`, `onsubmit`, `onscroll`
- Bindings: `bind:value`, `bind:this={element}`

## AI Integration Patterns

The codebase uses multiple AI services with profile-based configuration:

```typescript
// Get provider for specific service
const provider = this.getProviderForProfile(
  settings.systemServicesSettings.memory.profileId
);

// Stream responses with async generators
async *streamResponse(
  entries: StoryEntry[],
  signal?: AbortSignal
): AsyncIterable<StreamChunk> {
  for await (const chunk of provider.streamResponse({...})) {
    yield chunk;
  }
}
```

## Common Patterns

### Conditional Logging

```typescript
const DEBUG = true; // Set to false in production

function log(...args: any[]) {
  if (DEBUG) console.log('[Module]', ...args);
}
```

### Immutability

Always spread arrays/objects for state updates:

```typescript
// Good
this.entries = [...this.entries, newEntry];
this.characters = this.characters.map(c =>
  c.id === id ? { ...c, updates } : c
);

// Avoid direct mutations
this.entries.push(newEntry); // Bad
```

### UUID Generation

```typescript
import { crypto } from 'crypto';

const id = crypto.randomUUID();
```

## When in Doubt

- Follow existing patterns in similar files
- Check nearby components/services for conventions
- Use TypeScript strict mode - fix all type errors
- Run `npm run check` before committing
- Keep functions small and focused
- Use descriptive names over comments
