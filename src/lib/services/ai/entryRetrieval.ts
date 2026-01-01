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
  /** Minimum entries to trigger LLM selection (set to 0 to always use LLM) */
  llmThreshold: number;
  /** Maximum entries to include from Tier 3 (0 = unlimited) */
  maxTier3Entries: number;
  /** Enable LLM selection */
  enableLLMSelection: boolean;
  /** Number of recent story entries to check for matching */
  recentEntriesCount: number;
  /** Model to use for Tier 3 selection */
  tier3Model: string;
  /** Always use LLM to select ALL relevant entries (ignores threshold) */
  alwaysUseLLM: boolean;
}

export const DEFAULT_ENTRY_RETRIEVAL_CONFIG: EntryRetrievalConfig = {
  llmThreshold: 0, // Always run LLM selection
  maxTier3Entries: 0, // No limit - select all relevant
  enableLLMSelection: true,
  recentEntriesCount: 5,
  tier3Model: 'x-ai/grok-4.1-fast',
  alwaysUseLLM: true, // Always use LLM for comprehensive selection
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
   *
   * Tier 1: Always injected (injection.mode === 'always' or state-based conditions)
   * Tier 2/3: LLM selects ALL relevant entries from remaining pool
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

    // All remaining entries go to LLM for selection
    const remainingEntries = entries.filter(e => !tier1Ids.has(e.id) && e.injection.mode !== 'never');

    // Tier 2/3: LLM selection for ALL remaining entries
    let tier2: RetrievedEntry[] = [];
    let tier3: RetrievedEntry[] = [];

    if (this.config.enableLLMSelection && remainingEntries.length > 0 && this.provider) {
      log('Sending all remaining entries to LLM for selection:', remainingEntries.length);
      const llmSelected = await this.getLLMSelectedEntries(remainingEntries, userInput, recentStoryEntries);
      // Put LLM-selected entries in tier 2 (tier 3 reserved for future use if needed)
      tier2 = llmSelected;
      log('LLM selected entries:', tier2.length);
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
   * LLM-based selection for all non-Tier-1 entries.
   * Selects ALL relevant entries based on the current context.
   */
  private async getLLMSelectedEntries(
    availableEntries: Entry[],
    userInput: string,
    recentStoryEntries: StoryEntry[]
  ): Promise<RetrievedEntry[]> {
    if (!this.provider || availableEntries.length === 0) return [];

    // Build context for LLM - show more of the recent story
    const recentContent = recentStoryEntries
      .slice(-5)
      .map(e => {
        const prefix = e.type === 'user_action' ? '[ACTION]' : '[NARRATION]';
        return `${prefix}: ${e.content.substring(0, 400)}`;
      })
      .join('\n\n');

    // Build numbered entry list (simple 1, 2, 3...)
    const entryList = availableEntries
      .map((e, i) => `${i + 1}. [${e.type.toUpperCase()}] "${e.name}": ${e.description.substring(0, 250)}${e.description.length > 250 ? '...' : ''}`)
      .join('\n');

    const prompt = `You are a lorebook retrieval system. Your job is to select entries that could be relevant to the narrator.

## Current Scene
${recentContent || '(Story just started)'}

## User's Next Action
"${userInput}"

## Available Lorebook Entries
${entryList}

## Instructions
Select ALL entries that could possibly be relevant. When in doubt, INCLUDE the entry. It's better to include too much context than too little.

Include entries if they:
- Are mentioned or referenced in any way
- Describe characters who are or could be present
- Describe the current location or nearby areas
- Contain world-building, lore, magic systems, or background info
- Describe factions, organizations, or groups involved
- Could inform the narrator's response in any way
- Have ANY connection to the current situation

Return ONLY a JSON array of numbers: [1, 2, 3, ...]
Include ALL potentially relevant entries. Be generous with inclusion.`;

    try {
      const response = await this.provider.generateResponse({
        messages: [{ role: 'user', content: prompt }],
        model: this.config.tier3Model,
        temperature: 0.2,
        maxTokens: 300,
      });

      log('LLM selection response:', response.content);

      // Parse response - look for JSON array of numbers
      let selectedIndices: number[] = [];

      // Try to extract JSON array
      const jsonMatch = response.content.match(/\[[\d,\s]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            selectedIndices = parsed.filter(n => typeof n === 'number' && n > 0);
          }
        } catch {
          log('Failed to parse JSON array');
        }
      }

      // Fallback: extract any numbers from the response
      if (selectedIndices.length === 0) {
        const numMatches = response.content.matchAll(/\b(\d+)\b/g);
        for (const match of numMatches) {
          const num = parseInt(match[1], 10);
          if (num > 0 && num <= availableEntries.length) {
            selectedIndices.push(num);
          }
        }
        // Deduplicate
        selectedIndices = [...new Set(selectedIndices)];
      }

      log('Selected indices:', selectedIndices);

      // Map indices back to entries (1-indexed)
      const result: RetrievedEntry[] = [];

      for (const idx of selectedIndices) {
        const entry = availableEntries[idx - 1];
        if (entry) {
          result.push({
            entry,
            tier: 2,
            priority: 50 + entry.injection.priority,
            matchReason: 'LLM selected',
          });
        }
      }

      // Apply max limit if configured (0 = unlimited)
      if (this.config.maxTier3Entries > 0) {
        return result.slice(0, this.config.maxTier3Entries);
      }

      return result;
    } catch (error) {
      log('LLM selection failed:', error);
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

    let block = `\n\n[LOREBOOK CONTEXT]
(CANONICAL - All information below is established lore. Do not contradict these facts.)`;

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
