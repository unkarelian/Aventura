import { BaseAIService, type OpenAIProvider } from '../core/BaseAIService';
import type { StoryEntry, GenerationPreset } from '$lib/types';
import { promptService, type PromptContext, type StoryMode, type POV, type Tense } from '$lib/services/prompts';
import { tryParseJsonWithHealing } from '../utils/jsonHealing';
import {getJsonSupportLevel} from '../jsonSupport';
import {buildResponseFormat, maybeInjectJsonInstructions} from '../jsonInstructions';
import { createLogger } from '../core/config';

const log = createLogger('StyleReviewer');

// Phrase analysis result
export interface PhraseAnalysis {
  phrase: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  alternatives: string[];
  contexts: string[];
}

// Complete review result
export interface StyleReviewResult {
  phrases: PhraseAnalysis[];
  overallAssessment: string;
  reviewedEntryCount: number;
  timestamp: number;
}

/**
 * Service for analyzing narration text for repetitive phrases and style issues.
 * Runs in the background every N messages to provide writing guidance.
 */
export class StyleReviewerService extends BaseAIService {
  constructor(provider: OpenAIProvider, presetId: string = 'suggestions', settingsOverride?: Partial<GenerationPreset>) {
    super(provider, presetId, settingsOverride);
  }

  /**
   * Analyze narration entries for style issues.
   * Only analyzes visible (non-summarized) narration entries.
   * @param entries - Story entries to analyze
   * @param mode - Story mode (affects default POV/tense context)
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async analyzeStyle(entries: StoryEntry[], mode: StoryMode = 'adventure', pov?: POV, tense?: Tense): Promise<StyleReviewResult> {
    // Filter to only narration entries (exclude user_action, system, retry)
    const narrationEntries = entries.filter(e => e.type === 'narration');

    log('analyzeStyle called', {
      totalEntries: entries.length,
      narrationEntries: narrationEntries.length,
      model: this.model,
    });

    if (narrationEntries.length === 0) {
      return this.getEmptyResult();
    }

    // Combine narration text for analysis
    const combinedText = narrationEntries
      .map(e => e.content)
      .join('\n\n---\n\n');

    const promptContext: PromptContext = {
      mode,
      pov: pov ?? (mode === 'creative-writing' ? 'third' : 'second'),
      tense: tense ?? (mode === 'creative-writing' ? 'past' : 'present'),
      protagonistName: 'the protagonist',
    };
    const prompt = promptService.renderUserPrompt('style-reviewer', promptContext, {
      passageCount: narrationEntries.length,
      passages: combinedText,
    });

    const jsonSupportLevel = getJsonSupportLevel(this.presetId);
    const responseFormat = buildResponseFormat('style-reviewer', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'style-reviewer', jsonSupportLevel);

    try {
      log('Sending style analysis request...');

      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: promptService.renderPrompt('style-reviewer', promptContext) },
          { role: 'user', content: finalPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat, // Use responseFormat for structured output
      });

      log('Style analysis response received', {
        contentLength: response.content.length,
        usage: response.usage,
      });

      const result = this.parseAnalysisResponse(response.content, narrationEntries.length);
      log('Style analysis parsed', {
        phrasesFound: result.phrases.length,
      });

      return result;
    } catch (error) {
      log('Style analysis failed', error);
      return this.getEmptyResult();
    }
  }

  private parseAnalysisResponse(content: string, entryCount: number): StyleReviewResult {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse style analysis JSON');
      return this.getEmptyResult();
    }

    const phrases: PhraseAnalysis[] = [];
    const rawItems = Array.isArray(parsed.phrases)
      ? parsed.phrases
      : (Array.isArray(parsed.issues) ? parsed.issues : []);

    for (const item of rawItems.slice(0, 10)) {
      const phraseText = item.phrase ?? item.description;
      if (phraseText) {
        phrases.push({
          phrase: phraseText,
          frequency: typeof item.frequency === 'number'
            ? item.frequency
            : (typeof item.occurrences === 'number' ? item.occurrences : 2),
          severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'low',
          alternatives: Array.isArray(item.alternatives)
            ? item.alternatives.slice(0, 3)
            : (Array.isArray(item.suggestions) ? item.suggestions.slice(0, 3) : []),
          contexts: Array.isArray(item.contexts)
            ? item.contexts.slice(0, 2)
            : (Array.isArray(item.examples) ? item.examples.slice(0, 2) : []),
        });
      }
    }

    return {
      phrases,
      overallAssessment: parsed.overallAssessment || parsed.summary || '',
      reviewedEntryCount: entryCount,
      timestamp: Date.now(),
    };
  }

  private getEmptyResult(): StyleReviewResult {
    return {
      phrases: [],
      overallAssessment: '',
      reviewedEntryCount: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Format review results for injection into the main generation prompt.
   * Returns an empty string if there are no phrases to report.
   */
  static formatForPromptInjection(result: StyleReviewResult): string {
    if (result.phrases.length === 0) {
      return '';
    }

    let block = '\n\n<style_guidance>\n';
    block += '## Recent Style Review\n';
    block += 'The following phrases have been overused in recent narration. Please vary your language:\n\n';

    for (const phrase of result.phrases) {
      block += `- "${phrase.phrase}" (${phrase.frequency}x, ${phrase.severity})`;
      if (phrase.alternatives.length > 0) {
        block += ` - Try: ${phrase.alternatives.join(', ')}`;
      }
      block += '\n';
    }

    if (result.overallAssessment) {
      block += `\nNote: ${result.overallAssessment}`;
    }

    block += '\n</style_guidance>';
    return block;
  }
}
