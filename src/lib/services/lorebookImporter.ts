/**
 * Lorebook Importer Service
 *
 * Imports lorebooks from various formats (primarily SillyTavern) into Aventura's Entry system.
 */

import type { Entry, EntryType, EntryInjectionMode, EntryCreator } from '$lib/types';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[LorebookImporter]', ...args);
  }
}

// ===== SillyTavern Format Types =====

interface SillyTavernCharacterFilter {
  isExclude: boolean;
  names: string[];
  tags: string[];
}

interface SillyTavernEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;           // Entry name/title
  content: string;           // Entry description
  constant: boolean;         // Always inject
  vectorized: boolean;
  selective: boolean;        // Use keyword matching
  selectiveLogic: number;    // 0 = AND, 1 = OR, etc.
  addMemo: boolean;
  order: number;             // Priority
  position: number;
  disable: boolean;
  ignoreBudget: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  delayUntilRecursion: number;
  probability: number;
  useProbability: boolean;
  depth: number;
  outletName: string;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  role: string | null;
  sticky: boolean | null;
  cooldown: number | null;
  delay: number | null;
  triggers: string[];
  displayIndex: number;
  characterFilter: SillyTavernCharacterFilter;
}

interface SillyTavernLorebook {
  entries: Record<string, SillyTavernEntry>;
  // Optional metadata fields
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
}

// ===== Import Result Types =====

export interface ImportedEntry {
  name: string;
  type: EntryType;
  description: string;
  keywords: string[];
  injectionMode: EntryInjectionMode;
  priority: number;
  disabled: boolean;
  group: string | null;
  originalData: SillyTavernEntry;
}

export interface LorebookImportResult {
  success: boolean;
  entries: ImportedEntry[];
  errors: string[];
  warnings: string[];
  metadata: {
    format: 'sillytavern' | 'unknown';
    totalEntries: number;
    importedEntries: number;
    skippedEntries: number;
  };
}

// ===== Entry Type Inference =====

// Keywords that suggest entry types
const TYPE_KEYWORDS: Record<EntryType, string[]> = {
  character: [
    'character', 'person', 'npc', 'protagonist', 'antagonist', 'villain', 'hero',
    'he is', 'she is', 'they are', 'personality', 'appearance', 'occupation',
    'age:', 'gender:', 'species:', 'race:', 'class:'
  ],
  location: [
    'location', 'place', 'area', 'region', 'city', 'town', 'village', 'building',
    'room', 'forest', 'mountain', 'ocean', 'river', 'located in', 'found at',
    'geography', 'terrain', 'climate'
  ],
  item: [
    'item', 'weapon', 'armor', 'tool', 'artifact', 'object', 'equipment',
    'potion', 'scroll', 'key', 'contains', 'grants', 'provides', 'equip'
  ],
  faction: [
    'faction', 'organization', 'guild', 'group', 'clan', 'tribe', 'kingdom',
    'empire', 'alliance', 'order', 'members', 'leader', 'founded'
  ],
  concept: [
    'concept', 'magic', 'system', 'rule', 'lore', 'history', 'tradition',
    'technology', 'science', 'religion', 'culture', 'custom', 'law'
  ],
  event: [
    'event', 'war', 'battle', 'ceremony', 'festival', 'disaster', 'catastrophe',
    'happened', 'occurred', 'took place', 'anniversary', 'historical'
  ],
};

/**
 * Infer the entry type from content and name.
 */
function inferEntryType(name: string, content: string): EntryType {
  const textToAnalyze = `${name} ${content}`.toLowerCase();

  // Count keyword matches for each type
  const scores: Record<EntryType, number> = {
    character: 0,
    location: 0,
    item: 0,
    faction: 0,
    concept: 0,
    event: 0,
  };

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [EntryType, string[]][]) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        scores[type]++;
      }
    }
  }

  // Find the type with the highest score
  let maxType: EntryType = 'concept'; // Default
  let maxScore = 0;

  for (const [type, score] of Object.entries(scores) as [EntryType, number][]) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type;
    }
  }

  return maxType;
}

/**
 * Determine injection mode from SillyTavern entry flags.
 */
function determineInjectionMode(entry: SillyTavernEntry): EntryInjectionMode {
  if (entry.disable) {
    return 'never';
  }
  if (entry.constant) {
    return 'always';
  }
  if (entry.selective && entry.key.length > 0) {
    return 'keyword';
  }
  // Default to relevant (LLM-based selection)
  return 'relevant';
}

/**
 * Parse a SillyTavern lorebook JSON string.
 */
export function parseSillyTavernLorebook(jsonString: string): LorebookImportResult {
  const result: LorebookImportResult = {
    success: false,
    entries: [],
    errors: [],
    warnings: [],
    metadata: {
      format: 'unknown',
      totalEntries: 0,
      importedEntries: 0,
      skippedEntries: 0,
    },
  };

  try {
    const data = JSON.parse(jsonString);

    // Validate basic structure
    if (!data.entries || typeof data.entries !== 'object') {
      result.errors.push('Invalid lorebook format: missing "entries" object');
      return result;
    }

    result.metadata.format = 'sillytavern';

    const entries = Object.values(data.entries) as SillyTavernEntry[];
    result.metadata.totalEntries = entries.length;

    log('Parsing SillyTavern lorebook', {
      totalEntries: entries.length,
      name: data.name || 'Unnamed',
    });

    for (const entry of entries) {
      try {
        // Skip if no content AND no comment (empty entry)
        if (!entry.content?.trim() && !entry.comment?.trim()) {
          result.warnings.push(`Skipped empty entry (UID: ${entry.uid})`);
          result.metadata.skippedEntries++;
          continue;
        }

        // Use comment as name, fallback to first keyword or generate one
        let name = entry.comment?.trim();
        if (!name) {
          name = entry.key?.[0] || `Entry ${entry.uid}`;
          result.warnings.push(`Entry UID ${entry.uid} has no name, using "${name}"`);
        }

        // Combine primary and secondary keywords
        const keywords = [
          ...(entry.key || []),
          ...(entry.keysecondary || []),
        ].filter(k => k && k.trim());

        const importedEntry: ImportedEntry = {
          name,
          type: inferEntryType(name, entry.content || ''),
          description: entry.content || '',
          keywords,
          injectionMode: determineInjectionMode(entry),
          priority: entry.order ?? 100,
          disabled: entry.disable ?? false,
          group: entry.group?.trim() || null,
          originalData: entry,
        };

        result.entries.push(importedEntry);
        result.metadata.importedEntries++;

      } catch (entryError) {
        const errorMsg = entryError instanceof Error ? entryError.message : 'Unknown error';
        result.errors.push(`Failed to parse entry UID ${entry.uid}: ${errorMsg}`);
        result.metadata.skippedEntries++;
      }
    }

    result.success = result.metadata.importedEntries > 0;

    log('Import complete', {
      imported: result.metadata.importedEntries,
      skipped: result.metadata.skippedEntries,
      errors: result.errors.length,
      warnings: result.warnings.length,
    });

  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
    result.errors.push(`Failed to parse JSON: ${errorMsg}`);
    log('Parse error:', parseError);
  }

  return result;
}

/**
 * Convert imported entries to Aventura Entry format.
 * Note: Entries are created without storyId - this should be set when saving to database.
 */
export function convertToEntries(
  importedEntries: ImportedEntry[],
  createdBy: EntryCreator = 'import'
): Omit<Entry, 'id' | 'storyId'>[] {
  const now = Date.now();

  return importedEntries.map(imported => {
    // Create base state based on inferred type
    const baseState = { type: imported.type };

    // Create type-specific state
    let state: Entry['state'];
    switch (imported.type) {
      case 'character':
        state = {
          ...baseState,
          type: 'character',
          isPresent: false,
          lastSeenLocation: null,
          currentDisposition: null,
          relationship: {
            level: 0,
            status: 'unknown',
            history: [],
          },
          knownFacts: [],
          revealedSecrets: [],
        };
        break;
      case 'location':
        state = {
          ...baseState,
          type: 'location',
          isCurrentLocation: false,
          visitCount: 0,
          changes: [],
          presentCharacters: [],
          presentItems: [],
        };
        break;
      case 'item':
        state = {
          ...baseState,
          type: 'item',
          inInventory: false,
          currentLocation: null,
          condition: null,
          uses: [],
        };
        break;
      case 'faction':
        state = {
          ...baseState,
          type: 'faction',
          playerStanding: 0,
          status: 'unknown',
          knownMembers: [],
        };
        break;
      case 'event':
        state = {
          ...baseState,
          type: 'event',
          occurred: false,
          occurredAt: null,
          witnesses: [],
          consequences: [],
        };
        break;
      case 'concept':
      default:
        state = {
          ...baseState,
          type: 'concept',
          revealed: false,
          comprehensionLevel: 'unknown',
          relatedEntries: [],
        };
        break;
    }

    return {
      name: imported.name,
      type: imported.type,
      description: imported.description,
      hiddenInfo: null,
      aliases: imported.keywords.slice(0, 5), // Use first 5 keywords as aliases
      state,
      adventureState: null,
      creativeState: null,
      injection: {
        mode: imported.injectionMode,
        keywords: imported.keywords,
        priority: imported.priority,
      },
      firstMentioned: null,
      lastMentioned: null,
      mentionCount: 0,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Parse a lorebook file and return a preview of the entries.
 * This is used in the wizard to show users what will be imported.
 */
export function previewLorebook(jsonString: string): {
  success: boolean;
  preview: {
    name: string;
    type: EntryType;
    hasContent: boolean;
    keywordCount: number;
    injectionMode: EntryInjectionMode;
  }[];
  errors: string[];
  totalCount: number;
} {
  const result = parseSillyTavernLorebook(jsonString);

  return {
    success: result.success,
    preview: result.entries.map(e => ({
      name: e.name,
      type: e.type,
      hasContent: e.description.length > 0,
      keywordCount: e.keywords.length,
      injectionMode: e.injectionMode,
    })),
    errors: result.errors,
    totalCount: result.metadata.totalEntries,
  };
}

/**
 * Group imported entries by their type for display.
 */
export function groupEntriesByType(entries: ImportedEntry[]): Record<EntryType, ImportedEntry[]> {
  const grouped: Record<EntryType, ImportedEntry[]> = {
    character: [],
    location: [],
    item: [],
    faction: [],
    concept: [],
    event: [],
  };

  for (const entry of entries) {
    grouped[entry.type].push(entry);
  }

  return grouped;
}

/**
 * Get summary statistics for imported entries.
 */
export function getImportSummary(entries: ImportedEntry[]): {
  total: number;
  byType: Record<EntryType, number>;
  withContent: number;
  withKeywords: number;
  alwaysInject: number;
  disabled: number;
} {
  const byType: Record<EntryType, number> = {
    character: 0,
    location: 0,
    item: 0,
    faction: 0,
    concept: 0,
    event: 0,
  };

  let withContent = 0;
  let withKeywords = 0;
  let alwaysInject = 0;
  let disabled = 0;

  for (const entry of entries) {
    byType[entry.type]++;
    if (entry.description.length > 0) withContent++;
    if (entry.keywords.length > 0) withKeywords++;
    if (entry.injectionMode === 'always') alwaysInject++;
    if (entry.disabled) disabled++;
  }

  return {
    total: entries.length,
    byType,
    withContent,
    withKeywords,
    alwaysInject,
    disabled,
  };
}
