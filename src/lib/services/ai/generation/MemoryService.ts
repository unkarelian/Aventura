import { BaseAIService, type OpenAIProvider } from '../core/BaseAIService';
import type { Chapter, StoryEntry, MemoryConfig, TimeTracker, GenerationPreset } from '$lib/types';
import { promptService, type PromptContext, type StoryMode, type POV, type Tense } from '$lib/services/prompts';
import { tryParseJsonWithHealing } from '../utils/jsonHealing';
import {getJsonSupportLevel} from '../jsonSupport';
import {buildResponseFormat, maybeInjectJsonInstructions} from '../jsonInstructions';

// Format time tracker for display in context (always shows full format)
function formatTime(time: TimeTracker | null): string {
  // Default to Year 1, Day 1, 00:00 if null
  const t = time ?? { years: 0, days: 0, hours: 0, minutes: 0 };
  const year = t.years + 1; // Display as 1-indexed (Year 1 = years: 0)
  const day = t.days + 1;   // Display as 1-indexed (Day 1 = days: 0)
  const hour = t.hours.toString().padStart(2, '0');
  const minute = t.minutes.toString().padStart(2, '0');
  return `Year ${year}, Day ${day}, ${hour}:${minute}`;
}

// Format time range for chapter context
function formatTimeRange(startTime: TimeTracker | null, endTime: TimeTracker | null): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (start !== end) {
    return ` [${start} → ${end}]`;
  }
  return ` [${start}]`;
}

import { AI_CONFIG, createLogger, getContextConfig } from '../core/config';

const log = createLogger('Memory');

// Default memory configuration
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  tokenThreshold: AI_CONFIG.memory.defaultTokenThreshold,
  chapterBuffer: AI_CONFIG.memory.defaultChapterBuffer,
  autoSummarize: true,
  enableRetrieval: true,
  maxChaptersPerRetrieval: 3,
};

export interface ChapterAnalysis {
  shouldCreateChapter: boolean;
  optimalEndIndex: number;  // Index in entries array where chapter should end
  suggestedTitle: string | null;
}

export interface ChapterSummary {
  summary: string;
  title: string;
  keywords: string[];
  characters: string[];
  locations: string[];
  plotThreads: string[];
  emotionalTone: string;
}

export interface RetrievalDecision {
  relevantChapterIds: string[];
  queries: { chapterId: string; question: string }[];
}

export interface RetrievedContext {
  chapterId: string;
  chapterNumber: number;
  summary: string;
  relevantExcerpt: string | null;
}

export class MemoryService extends BaseAIService {
  constructor(provider: OpenAIProvider, presetId: string = 'memory', settingsOverride?: Partial<GenerationPreset>) {
    super(provider, presetId, settingsOverride);
  }
  /**
   * Analyze if a new chapter should be created based on token count.
   * Triggered when tokens exceed threshold, excluding buffer messages.
   * Per design doc section 3.1.2: Auto-Summarization
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async analyzeForChapter(
    entries: StoryEntry[],
    lastChapterEndIndex: number,
    config: MemoryConfig,
    tokensOutsideBuffer: number,
    mode: StoryMode = 'adventure',
    pov?: POV,
    tense?: Tense
  ): Promise<ChapterAnalysis> {
    const messagesSinceLastChapter = entries.length - lastChapterEndIndex;

    log('analyzeForChapter', {
      totalEntries: entries.length,
      lastChapterEndIndex,
      messagesSinceLastChapter,
      tokensOutsideBuffer,
      tokenThreshold: config.tokenThreshold,
      buffer: config.chapterBuffer,
    });

    // Check if there are any messages outside the buffer
    if (messagesSinceLastChapter <= config.chapterBuffer) {
      log('All messages are within buffer, skipping');
      return {
        shouldCreateChapter: false,
        optimalEndIndex: -1,
        suggestedTitle: null,
      };
    }

    // Check if tokens exceed threshold
    if (tokensOutsideBuffer < config.tokenThreshold) {
      log('Tokens outside buffer below threshold', {
        tokensOutsideBuffer,
        threshold: config.tokenThreshold,
      });
      return {
        shouldCreateChapter: false,
        optimalEndIndex: -1,
        suggestedTitle: null,
      };
    }

    // Get entries since last chapter, excluding the buffer
    const startIndex = lastChapterEndIndex;
    const endIndex = entries.length - config.chapterBuffer;
    const chapterEntries = entries.slice(startIndex, endIndex);

    if (chapterEntries.length === 0) {
      log('No entries outside buffer to summarize');
      return {
        shouldCreateChapter: false,
        optimalEndIndex: -1,
        suggestedTitle: null,
      };
    }

    // Ask AI to find optimal chapter break point
    // Pass startIndex so message IDs are correctly numbered
    const promptContext = this.getPromptContext(mode, pov, tense);
    const prompt = this.buildChapterAnalysisPrompt(chapterEntries, startIndex, promptContext);

    const jsonSupportLevel = getJsonSupportLevel(this.presetId);
    const responseFormat = buildResponseFormat('chapter-analysis', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'chapter-analysis', jsonSupportLevel);

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: promptService.renderPrompt('chapter-analysis', promptContext) },
          { role: 'user', content: finalPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat, // Use responseFormat for structured output
      });

      const result = this.parseChapterAnalysis(response.content, startIndex, chapterEntries.length);
      log('Chapter analysis result:', result);
      return result;
    } catch (error) {
      log('Chapter analysis failed:', error);
      // Fallback: use all entries outside buffer as the chapter
      return {
        shouldCreateChapter: true,
        optimalEndIndex: endIndex, // End at the buffer boundary
        suggestedTitle: null,
      };
    }
  }

  /**
   * Generate a summary and metadata for a chapter.
   * @param entries - The entries to summarize
   * @param previousChapters - Previous chapter summaries for context (optional)
   * @param mode - Story mode from story settings
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async summarizeChapter(entries: StoryEntry[], previousChapters?: Chapter[], mode: StoryMode = 'adventure', pov?: POV, tense?: Tense): Promise<ChapterSummary> {
    log('summarizeChapter called', { entryCount: entries.length, previousChaptersCount: previousChapters?.length ?? 0 });

    const content = entries.map((e, i) => {
      const prefix = e.type === 'user_action' ? '[ACTION]' : '[NARRATION]';
      return `${i + 1}. ${prefix} ${e.content}`;
    }).join('\n\n');

    // Build previous summaries context
    let previousContext = '';
    if (previousChapters && previousChapters.length > 0) {
      const summaries = previousChapters
        .sort((a, b) => a.number - b.number)
        .map(ch => `Chapter ${ch.number}${ch.title ? ` - ${ch.title}` : ''}: ${ch.summary}`)
        .join('\n\n');
      previousContext = `<previous_chapter_summaries>
${summaries}
NOTE: Only use for reference. This is NOT what you will be summarizing.
</previous_chapter_summaries>

`;
    }

    const promptContext = this.getPromptContext(mode, pov, tense);
    const prompt = promptService.renderUserPrompt('chapter-summarization', promptContext, {
      previousContext,
      chapterContent: content,
    });

    const jsonSupportLevel = getJsonSupportLevel(this.presetId);
    const responseFormat = buildResponseFormat('chapter-summarization', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'chapter-summarization', jsonSupportLevel);

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: promptService.renderPrompt('chapter-summarization', promptContext) },
          { role: 'user', content: finalPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat, // Use responseFormat for structured output
      });

      return this.parseChapterSummary(response.content);
    } catch (error) {
      log('Chapter summarization failed:', error);
      // Fallback summary
      return {
        summary: 'Chapter summary unavailable.',
        title: 'Untitled Chapter',
        keywords: [],
        characters: [],
        locations: [],
        plotThreads: [],
        emotionalTone: 'neutral',
      };
    }
  }

  /**
   * Resummarize an existing chapter (excludes its own old summary and later chapters)
   * @param chapter - The chapter to resummarize
   * @param entries - The entries in this chapter
   * @param allChapters - All chapters in the story
   * @param mode - Story mode (affects prompt context defaults)
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async resummarizeChapter(
    chapter: Chapter,
    entries: StoryEntry[],
    allChapters: Chapter[],
    mode: StoryMode = 'adventure',
    pov?: POV,
    tense?: Tense
  ): Promise<ChapterSummary> {
    log('resummarizeChapter called', { chapterId: chapter.id, chapterNumber: chapter.number, mode });

    // Get only chapters BEFORE this one (not current, not after)
    const previousChapters = allChapters
      .filter(ch => ch.number < chapter.number)
      .sort((a, b) => a.number - b.number);

    return this.summarizeChapter(entries, previousChapters, mode, pov, tense);
  }

  /**
   * Decide which chapters are relevant for the current context.
   * Per design doc section 3.1.3: Retrieval Flow
   * @param userInput
   * @param recentEntries
   * @param chapters
   * @param config
   * @param mode
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async decideRetrieval(
    userInput: string,
    recentEntries: StoryEntry[],
    chapters: Chapter[],
    config: MemoryConfig,
    mode: StoryMode = 'adventure',
    pov?: POV,
    tense?: Tense
  ): Promise<RetrievalDecision> {
    if (!config.enableRetrieval || chapters.length === 0) {
      return { relevantChapterIds: [], queries: [] };
    }

    log('decideRetrieval', {
      userInput: userInput.substring(0, 100),
      recentEntriesCount: recentEntries.length,
      chaptersCount: chapters.length,
    });

    const chapterSummaries = chapters.map(ch => ({
      id: ch.id,
      number: ch.number,
      title: ch.title,
      summary: ch.summary,
      characters: ch.characters,
      locations: ch.locations,
    }));

    const contextConfig = getContextConfig();
    const recentContext = recentEntries.slice(-contextConfig.recentEntriesForRetrieval).map(e => e.content).join('\n');

    const promptContext = this.getPromptContext(mode, pov, tense);
    const prompt = promptService.renderUserPrompt('retrieval-decision', promptContext, {
      userInput,
      recentContext,
      chapterSummaries: JSON.stringify(chapterSummaries, null, 2),
      maxChaptersPerRetrieval: config.maxChaptersPerRetrieval,
    });

    const jsonSupportLevel = getJsonSupportLevel(this.presetId);
    const responseFormat = buildResponseFormat('retrieval-decision', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'retrieval-decision', jsonSupportLevel);

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: promptService.renderPrompt('retrieval-decision', promptContext) },
          { role: 'user', content: finalPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat, // Use responseFormat for structured output
      });

      return this.parseRetrievalDecision(response.content, config.maxChaptersPerRetrieval);
    } catch (error) {
      log('Retrieval decision failed:', error);
      return { relevantChapterIds: [], queries: [] };
    }
  }

  /**
   * Build context block from retrieved chapters for injection into narrator prompt.
   */
  buildRetrievedContextBlock(
    chapters: Chapter[],
    decision: RetrievalDecision
  ): string {
    if (decision.relevantChapterIds.length === 0) {
      return '';
    }

    const relevantChapters = chapters.filter(ch =>
      decision.relevantChapterIds.includes(ch.id)
    );

    if (relevantChapters.length === 0) {
      return '';
    }

    let contextBlock = '\n\n[FROM EARLIER IN THE STORY]';

    for (const chapter of relevantChapters) {
      contextBlock += `\n\n• Chapter ${chapter.number}`;
      if (chapter.title) {
        contextBlock += ` - "${chapter.title}"`;
      }
      // Add time range if available
      const timeRange = formatTimeRange(chapter.startTime, chapter.endTime);
      if (timeRange) {
        contextBlock += timeRange;
      }
      contextBlock += `:\n${chapter.summary}`;
    }

    return contextBlock;
  }

  private buildChapterAnalysisPrompt(
    entries: StoryEntry[],
    startIndex: number,
    promptContext: PromptContext
  ): string {
    // Format messages with their actual IDs (1-based for clarity)
    const messagesInRange = entries.map((e, i) => {
      const messageId = startIndex + i + 1; // 1-based message ID
      const prefix = e.type === 'user_action' ? '[ACTION]' : '[NARRATION]';
      return `Message ${messageId}:\n${prefix} ${e.content}`;
    }).join('\n\n---\n\n');

    const firstValidId = startIndex + 1;
    const lastValidId = startIndex + entries.length;

    return promptService.renderUserPrompt('chapter-analysis', promptContext, {
      firstValidId,
      lastValidId,
      messagesInRange,
    });
  }

  private getPromptContext(mode: StoryMode = 'adventure', pov?: POV, tense?: Tense): PromptContext {
    return {
      mode,
      pov: pov ?? (mode === 'creative-writing' ? 'third' : 'second'),
      tense: tense ?? (mode === 'creative-writing' ? 'past' : 'present'),
      protagonistName: 'the protagonist',
    };
  }

  private parseChapterAnalysis(
    content: string,
    startIndex: number,
    entryCount: number
  ): ChapterAnalysis {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse chapter analysis');
      return {
        shouldCreateChapter: true,
        optimalEndIndex: startIndex + entryCount,
        suggestedTitle: null,
      };
    }

    // Handle both old format (optimalEndIndex) and new format (chapterEnd)
    // chapterEnd is 1-based message ID, optimalEndIndex is relative to startIndex
    let endIndex: number;
    if (parsed.chapterEnd !== undefined) {
      // New format: chapterEnd is absolute 1-based message ID
      // Convert to 0-based array index
      endIndex = Math.min(Math.max(startIndex + 1, parsed.chapterEnd), startIndex + entryCount);
    } else if (parsed.optimalEndIndex !== undefined) {
      // Old format: relative index within the chunk
      const relativeIndex = Math.min(Math.max(1, parsed.optimalEndIndex), entryCount);
      endIndex = startIndex + relativeIndex;
    } else {
      // Fallback: use end of range
      endIndex = startIndex + entryCount;
    }

    log('Parsed chapter endpoint', {
      chapterEnd: parsed.chapterEnd,
      optimalEndIndex: parsed.optimalEndIndex,
      startIndex,
      entryCount,
      finalEndIndex: endIndex,
    });

    return {
      shouldCreateChapter: true,
      optimalEndIndex: endIndex,
      suggestedTitle: parsed.suggestedTitle || null,
    };
  }

  private parseChapterSummary(content: string): ChapterSummary {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse chapter summary');
      return {
        summary: 'Summary unavailable.',
        title: 'Untitled Chapter',
        keywords: [],
        characters: [],
        locations: [],
        plotThreads: [],
        emotionalTone: 'neutral',
      };
    }

    return {
      summary: parsed.summary || 'Summary unavailable.',
      title: parsed.title || 'Untitled Chapter',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      plotThreads: Array.isArray(parsed.plotThreads) ? parsed.plotThreads : [],
      emotionalTone: parsed.emotionalTone || 'neutral',
    };
  }

  private parseRetrievalDecision(content: string, maxChapters: number): RetrievalDecision {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse retrieval decision');
      return { relevantChapterIds: [], queries: [] };
    }

    const ids = Array.isArray(parsed.relevantChapterIds)
      ? parsed.relevantChapterIds.slice(0, maxChapters)
      : [];
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries.slice(0, maxChapters)
      : [];

    return { relevantChapterIds: ids, queries };
  }
}
