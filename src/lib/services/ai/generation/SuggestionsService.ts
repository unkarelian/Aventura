import { BaseAIService, type OpenAIProvider } from '../core/BaseAIService';
import type { StoryEntry, StoryBeat, Entry, GenerationPreset } from '$lib/types';
import { promptService, type PromptContext, type POV, type Tense } from '$lib/services/prompts';
import { tryParseJsonWithHealing } from '../utils/jsonHealing';
import {getJsonSupportLevel} from '../jsonSupport';
import {buildResponseFormat, maybeInjectJsonInstructions} from '../jsonInstructions';
import { createLogger, getContextConfig, getLorebookConfig } from '../core/config';

const log = createLogger('Suggestions');

export interface StorySuggestion {
  text: string;
  type: 'action' | 'dialogue' | 'revelation' | 'twist';
}

export interface SuggestionsResult {
  suggestions: StorySuggestion[];
}

export class SuggestionsService extends BaseAIService {
  constructor(provider: OpenAIProvider, presetId: string = 'suggestions', settingsOverride?: Partial<GenerationPreset>) {
    super(provider, presetId, settingsOverride);
  }

  /**
   * Generate story direction suggestions for creative writing mode.
   * Per design doc section 4.2: Suggestions System
   * @param promptContext - Complete story context for macro expansion (preferred)
   * @param pov - Point of view (deprecated, use promptContext)
   * @param tense - Tense (deprecated, use promptContext)
   */
  async generateSuggestions(
    recentEntries: StoryEntry[],
    activeThreads: StoryBeat[],
    lorebookEntries?: Entry[],
    promptContext?: PromptContext,
    pov?: POV,
    tense?: Tense
  ): Promise<SuggestionsResult> {
    log('generateSuggestions called', {
      recentEntriesCount: recentEntries.length,
      activeThreadsCount: activeThreads.length,
      hasPromptContext: !!promptContext,
      lorebookEntriesCount: lorebookEntries?.length ?? 0,
    });

    // Get the last few entries for context
    const contextConfig = getContextConfig();
    const lorebookConfig = getLorebookConfig();
    const lastEntries = recentEntries.slice(-contextConfig.recentEntriesForRetrieval);
    const lastContent = lastEntries.map(e => {
      const prefix = e.type === 'user_action' ? '[DIRECTION]' : '[NARRATIVE]';
      return `${prefix} ${e.content}`;
    }).join('\n\n');

    // Format active threads
    const threadsContext = activeThreads.length > 0
      ? activeThreads.map(t => `• ${t.title}${t.description ? `: ${t.description}` : ''}`).join('\n')
      : '(none)';

    // Format lorebook entries for context
    let lorebookContext = '';
    if (lorebookEntries && lorebookEntries.length > 0) {
      const entryDescriptions = lorebookEntries.slice(0, lorebookConfig.maxForSuggestions).map(e => {
        let desc = `• ${e.name} (${e.type})`;
        if (e.description) {
          desc += `: ${e.description}`;
        }
        return desc;
      }).join('\n');
      lorebookContext = `\n## Lorebook/World Elements\nThe following characters, locations, and concepts exist in this world and can be incorporated into suggestions:\n${entryDescriptions}`;
    }

    // Use provided context or build minimal fallback
    const context: PromptContext = promptContext ?? {
      mode: 'creative-writing',
      pov: pov ?? 'third',
      tense: tense ?? 'past',
      protagonistName: 'the protagonist',
    };

    // Build genre string from context if available
    const genreStr = context.genre ? `## Genre: ${context.genre}\n` : '';

    const prompt = promptService.renderUserPrompt('suggestions', context, {
      recentContent: lastContent,
      activeThreads: threadsContext,
      genre: genreStr,
      lorebookContext,
    });

    const jsonSupportLevel = getJsonSupportLevel(this.presetId);
    const responseFormat = buildResponseFormat('suggestions', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'suggestions', jsonSupportLevel);

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: promptService.renderPrompt('suggestions', context) },
          { role: 'user', content: finalPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat, // Use responseFormat for structured output
      });

      const result = this.parseSuggestions(response.content);
      log('Suggestions generated:', result.suggestions.length);
      return result;
    } catch (error) {
      log('Suggestions generation failed:', error);
      return { suggestions: [] };
    }
  }

  private parseSuggestions(content: string): SuggestionsResult {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse suggestions');
      return { suggestions: [] };
    }

    const suggestions: StorySuggestion[] = [];
    if (Array.isArray(parsed.suggestions)) {
      for (const s of parsed.suggestions.slice(0, 3)) {
        if (s.text) {
          suggestions.push({
            text: s.text,
            type: ['action', 'dialogue', 'revelation', 'twist'].includes(s.type)
              ? s.type
              : 'action',
          });
        }
      }
    }

    return { suggestions };
  }
}
