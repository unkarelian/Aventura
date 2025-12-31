/**
 * Entry Retrieval Service for Aventura
 * Per design doc section 3.2.3: Tiered Injection
 *
 * Implements three tiers of entry injection for lorebook entries:
 * - Tier 1: Always inject (injection.mode === 'always', or state-based like isPresent)
 * - Tier 2: Keyword matching (fuzzy match name/aliases/keywords against input)
 * - Tier 3: LLM selection (for large entry counts, runs in parallel)
 */

import type { Entry, EntryType, StoryEntry } from '$lib/types';
import type { OpenRouterProvider } from './openrouter';
import { settings } from '$lib/stores/settings.svelte';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[EntryRetrieval]', ...args);
  }
}

export interface EntryRetrievalConfig {
  /** Threshold for triggering LLM selection (Tier 3) */
  llmThreshold: number;
  /** Maximum entries to include from Tier 3 */
  maxTier3Entries: number;
  /** Enable LLM selection for large entry counts */
  enableLLMSelection: boolean;
  /** Number of recent story entries to check for matching */
  recentEntriesCount: number;
  /** Model to use for Tier 3 selection */
  tier3Model: string;
}

export const DEFAULT_ENTRY_RETRIEVAL_CONFIG: EntryRetrievalConfig = {
  llmThreshold: 30,
  maxTier3Entries: 10,
  enableLLMSelection: true,
  recentEntriesCount: 5,
  tier3Model: 'google/gemini-2.0-flash-001',
};

export interface RetrievedEntry {
  entry: Entry;
  tier: 1 | 2 | 3;
  priority: number;
  matchReason?: string;
}

export interface EntryRetrievalResult {
  tier1: RetrievedEntry[];
  tier2: RetrievedEntry[];
  tier3: RetrievedEntry[];
  all: RetrievedEntry[];
  contextBlock: string;
}

export class EntryRetrievalService {
  private provider: OpenRouterProvider | null;
  private config: EntryRetrievalConfig;

  constructor(provider: OpenRouterProvider | null, config: Partial<EntryRetrievalConfig> = {}) {
    this.provider = provider;
    this.config = { ...DEFAULT_ENTRY_RETRIEVAL_CONFIG, ...config };
  }

  /**
   * Retrieve relevant entries using tiered injection.
   */
  async getRelevantEntries(
    entries: Entry[],
    userInput: string,
    recentStoryEntries: StoryEntry[]
  ): Promise<EntryRetrievalResult> {
    if (entries.length === 0) {
      return {
        tier1: [],
        tier2: [],
        tier3: [],
        all: [],
        contextBlock: '',
      };
    }

    log('getRelevantEntries called', {
      totalEntries: entries.length,
      userInputLength: userInput.length,
      recentCount: recentStoryEntries.length,
    });

    // Tier 1: Always inject - entries with injection.mode === 'always' or state-based
    const tier1 = this.getTier1Entries(entries);
    log('Tier 1 entries:', tier1.length);

    // Get IDs already in tier 1
    const tier1Ids = new Set(tier1.map(e => e.entry.id));

    // Tier 2: Keyword/name matching
    const tier2 = this.getTier2Entries(entries, userInput, recentStoryEntries, tier1Ids);
    log('Tier 2 entries:', tier2.length);

    // Get IDs in tier 1 + 2
    const tier12Ids = new Set([...tier1Ids, ...tier2.map(e => e.entry.id)]);

    // Tier 3: LLM selection (conditional)
    let tier3: RetrievedEntry[] = [];
    const remainingEntries = entries.filter(e => !tier12Ids.has(e.id));

    if (
      this.config.enableLLMSelection &&
      remainingEntries.length > this.config.llmThreshold &&
      this.provider
    ) {
      tier3 = await this.getTier3Entries(remainingEntries, userInput, recentStoryEntries);
      log('Tier 3 entries:', tier3.length);
    }

    // Combine and sort by priority
    const all = [...tier1, ...tier2, ...tier3].sort((a, b) => b.priority - a.priority);

    // Build context block
    const contextBlock = this.buildContextBlock(tier1, tier2, tier3);

    return { tier1, tier2, tier3, all, contextBlock };
  }

  /**
   * Tier 1: Always inject entries.
   * - Entries with injection.mode === 'always'
   * - Characters that are present (state.isPresent === true)
   * - Current location (state.isCurrentLocation === true)
   * - Items in inventory (state.inInventory === true)
   */
  private getTier1Entries(entries: Entry[]): RetrievedEntry[] {
    const result: RetrievedEntry[] = [];

    for (const entry of entries) {
      let shouldInclude = false;
      let priority = 0;
      let reason = '';

      // Check injection mode
      if (entry.injection.mode === 'always') {
        shouldInclude = true;
        priority = 100;
        reason = 'always inject';
      }

      // Check state-based conditions
      if (entry.state) {
        switch (entry.state.type) {
          case 'character':
            if ('isPresent' in entry.state && entry.state.isPresent) {
              shouldInclude = true;
              priority = Math.max(priority, 95);
              reason = 'character present';
            }
            break;
          case 'location':
            if ('isCurrentLocation' in entry.state && entry.state.isCurrentLocation) {
              shouldInclude = true;
              priority = Math.max(priority, 100);
              reason = 'current location';
            }
            break;
          case 'item':
            if ('inInventory' in entry.state && entry.state.inInventory) {
              shouldInclude = true;
              priority = Math.max(priority, 80);
              reason = 'in inventory';
            }
            break;
          case 'faction':
            // Include factions player is allied/hostile with
            if ('status' in entry.state && (entry.state.status === 'allied' || entry.state.status === 'hostile')) {
              shouldInclude = true;
              priority = Math.max(priority, 70);
              reason = `faction ${entry.state.status}`;
            }
            break;
        }
      }

      if (shouldInclude) {
        result.push({
          entry,
          tier: 1,
          priority,
          matchReason: reason,
        });
      }
    }

    return result;
  }

  /**
   * Tier 2: Keyword and name matching.
   * Matches entry names, aliases, and keywords against user input and recent messages.
   */
  private getTier2Entries(
    entries: Entry[],
    userInput: string,
    recentStoryEntries: StoryEntry[],
    excludeIds: Set<string>
  ): RetrievedEntry[] {
    const result: RetrievedEntry[] = [];

    // Build search text from user input and recent story entries
    const recentContent = recentStoryEntries
      .slice(-this.config.recentEntriesCount)
      .map(e => e.content)
      .join(' ');
    const searchText = (userInput + ' ' + recentContent).toLowerCase();

    for (const entry of entries) {
      if (excludeIds.has(entry.id)) continue;
      if (entry.injection.mode === 'never') continue;

      // Check if name matches
      const nameMatch = this.textMatches(entry.name, searchText);

      // Check if any alias matches
      const aliasMatch = entry.aliases.some(alias => this.textMatches(alias, searchText));

      // Check if any keyword matches (for keyword mode entries)
      const keywordMatch = entry.injection.mode === 'keyword' &&
        entry.injection.keywords.some(kw => this.textMatches(kw, searchText));

      if (nameMatch || aliasMatch || keywordMatch) {
        result.push({
          entry,
          tier: 2,
          priority: entry.injection.priority + (nameMatch ? 20 : 0) + (aliasMatch ? 10 : 0),
          matchReason: nameMatch ? 'name match' : aliasMatch ? 'alias match' : 'keyword match',
        });
      }
    }

    return result;
  }

  /**
   * Tier 3: LLM-based selection for remaining entries.
   */
  private async getTier3Entries(
    remainingEntries: Entry[],
    userInput: string,
    recentStoryEntries: StoryEntry[]
  ): Promise<RetrievedEntry[]> {
    if (!this.provider || remainingEntries.length === 0) return [];

    // Build context for LLM
    const recentContent = recentStoryEntries
      .slice(-3)
      .map(e => `[${e.type}]: ${e.content.substring(0, 200)}...`)
      .join('\n');

    const entrySummaries = remainingEntries
      .slice(0, 50) // Limit to prevent token overflow
      .map((e, i) => `${i + 1}. [${e.type}] ${e.name}: ${e.description.substring(0, 150)}`)
      .join('\n');

    const prompt = `You are selecting which lorebook entries are relevant for the next narrative response.

CURRENT SCENE:
${recentContent}

USER'S INPUT:
"${userInput}"

AVAILABLE ENTRIES:
${entrySummaries}

Which entries (by number) are relevant to the current scene and user input?
Consider:
- Characters who might be referenced or affected
- Locations that might be mentioned
- Items, factions, or concepts that could be relevant
- Lore that connects to this moment

Return a JSON array of numbers for relevant entries. Only include entries that are ACTUALLY relevant.
Example: [1, 3, 7]

If no entries are relevant, return: []`;

    try {
      const response = await this.provider.generateResponse({
        messages: [{ role: 'user', content: prompt }],
        model: this.config.tier3Model,
        temperature: 0.1,
        maxTokens: 200,
      });

      // Parse response
      const match = response.content.match(/\[[\d,\s]*\]/);
      if (!match) {
        log('Failed to parse LLM selection response');
        return [];
      }

      const selectedIndices: number[] = JSON.parse(match[0]);
      const result: RetrievedEntry[] = [];

      for (const idx of selectedIndices) {
        const entry = remainingEntries[idx - 1]; // 1-indexed in prompt
        if (entry) {
          result.push({
            entry,
            tier: 3,
            priority: 30,
            matchReason: 'LLM selected',
          });
        }
      }

      return result.slice(0, this.config.maxTier3Entries);
    } catch (error) {
      log('Tier 3 LLM selection failed:', error);
      return [];
    }
  }

  /**
   * Check if text matches in search content.
   */
  private textMatches(text: string, searchContent: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (normalized.length < 2) return false;

    // Exact match
    if (searchContent.includes(normalized)) {
      return true;
    }

    // Word boundary match
    const wordPattern = new RegExp(`\\b${this.escapeRegex(normalized)}\\b`, 'i');
    if (wordPattern.test(searchContent)) {
      return true;
    }

    return false;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Build context block for prompt injection.
   */
  private buildContextBlock(
    tier1: RetrievedEntry[],
    tier2: RetrievedEntry[],
    tier3: RetrievedEntry[]
  ): string {
    const all = [...tier1, ...tier2, ...tier3];
    if (all.length === 0) return '';

    let block = '\n\n[LOREBOOK CONTEXT]';

    // Group by type
    const byType: Record<EntryType, RetrievedEntry[]> = {
      character: [],
      location: [],
      item: [],
      faction: [],
      concept: [],
      event: [],
    };

    for (const retrieved of all) {
      byType[retrieved.entry.type].push(retrieved);
    }

    // Characters
    if (byType.character.length > 0) {
      block += '\n\n• Characters:';
      for (const { entry } of byType.character) {
        block += `\n  - ${entry.name}: ${entry.description}`;
        if (entry.state?.type === 'character') {
          const state = entry.state;
          if (state.currentDisposition) {
            block += ` [${state.currentDisposition}]`;
          }
        }
      }
    }

    // Locations
    if (byType.location.length > 0) {
      block += '\n\n• Locations:';
      for (const { entry } of byType.location) {
        block += `\n  - ${entry.name}: ${entry.description}`;
      }
    }

    // Items
    if (byType.item.length > 0) {
      block += '\n\n• Items:';
      for (const { entry } of byType.item) {
        block += `\n  - ${entry.name}: ${entry.description}`;
      }
    }

    // Factions
    if (byType.faction.length > 0) {
      block += '\n\n• Factions:';
      for (const { entry } of byType.faction) {
        block += `\n  - ${entry.name}: ${entry.description}`;
      }
    }

    // Concepts
    if (byType.concept.length > 0) {
      block += '\n\n• Lore:';
      for (const { entry } of byType.concept) {
        block += `\n  - ${entry.name}: ${entry.description}`;
      }
    }

    // Events
    if (byType.event.length > 0) {
      block += '\n\n• Events:';
      for (const { entry } of byType.event) {
        block += `\n  - ${entry.name}: ${entry.description}`;
      }
    }

    return block;
  }
}

/**
 * Quick function to get relevant entries without a full service instance.
 */
export async function getRelevantEntries(
  entries: Entry[],
  userInput: string,
  recentStoryEntries: StoryEntry[],
  provider?: OpenRouterProvider
): Promise<EntryRetrievalResult> {
  const service = new EntryRetrievalService(provider || null);
  return service.getRelevantEntries(entries, userInput, recentStoryEntries);
}
