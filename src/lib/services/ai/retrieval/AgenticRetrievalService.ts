import { BaseAIService, type OpenAIProvider } from '../core/BaseAIService';
import type {
  Tool,
  ToolCall,
  AgenticMessage,
} from '../core/types';
import type {
  Chapter,
  StoryEntry,
  Entry,
  GenerationPreset,
} from '$lib/types';
import type { ReasoningEffort } from '$lib/types';
import { promptService, type PromptContext, type StoryMode, type POV, type Tense } from '$lib/services/prompts';
import { parseJsonWithHealing } from '../utils/jsonHealing';
import { AI_CONFIG, createLogger } from '../core/config';

const log = createLogger('AgenticRetrieval');

// Tool definitions for Agentic Retrieval (per design doc section 3.1.4)
const RETRIEVAL_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'list_chapters',
      description: 'List all available chapters with their summaries, characters, and locations',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_chapter',
      description: 'Ask a specific question about a single chapter to get relevant information',
      parameters: {
        type: 'object',
        properties: {
          chapter_number: {
            type: 'number',
            description: 'The chapter number to query',
          },
          question: {
            type: 'string',
            description: 'The specific question to answer about this chapter',
          },
        },
        required: ['chapter_number', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_chapters',
      description: 'Ask a question across a range of chapters (max 3 per query) for broader information',
      parameters: {
        type: 'object',
        properties: {
          start_chapter: {
            type: 'number',
            description: 'First chapter in the range',
          },
          end_chapter: {
            type: 'number',
            description: 'Last chapter in the range',
          },
          question: {
            type: 'string',
            description: 'The question to answer',
          },
        },
        required: ['start_chapter', 'end_chapter', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_entries',
      description: 'List lorebook entries for cross-referencing with story context',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Optional filter by entry type',
            enum: ['character', 'location', 'item', 'faction', 'concept', 'event'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish_retrieval',
      description: 'Signal that retrieval is complete and provide synthesized context',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Synthesized context from retrieved information that is relevant to the current situation',
          },
        },
        required: ['summary'],
      },
    },
  },
];

// NOTE: The default system prompt for Agentic Retrieval is now in the centralized
// prompt system at src/lib/services/prompts/definitions.ts (template id: 'agentic-retrieval')
// The systemPrompt field in AgenticRetrievalSettings is kept for backwards compatibility
// with user-customized settings, but the actual prompt is rendered via promptService.

export interface AgenticRetrievalContext {
  userInput: string;
  recentEntries: StoryEntry[];
  chapters: Chapter[];
  entries: Entry[];
}

export interface AgenticRetrievalResult {
  context: string;
  queriedChapters: number[];
  iterations: number;
  sessionId: string;
}

export class AgenticRetrievalService extends BaseAIService {
  private maxIterations: number;

  constructor(
    provider: OpenAIProvider,
    presetId: string = 'agentic',
    maxIterations: number = 10,
    settingsOverride?: Partial<GenerationPreset>
  ) {
    super(provider, presetId, settingsOverride);
    this.maxIterations = maxIterations;
  }

  /**
   * Run agentic retrieval to gather context for the current situation.
   * Per design doc section 3.1.4: Agentic Retrieval (Optional)
   * @param context - The retrieval context
   * @param onQueryChapter - Callback for querying a single chapter
   * @param onQueryChapters - Callback for querying a range of chapters
   * @param signal - Optional abort signal
   * @param mode - Story mode (affects prompt context defaults)
   * @param pov - Point of view from story settings
   * @param tense - Tense from story settings
   */
  async runRetrieval(
    context: AgenticRetrievalContext,
    onQueryChapter?: (chapterNumber: number, question: string) => Promise<string>,
    onQueryChapters?: (startChapter: number, endChapter: number, question: string) => Promise<string>,
    signal?: AbortSignal,
    mode: StoryMode = 'adventure',
    pov?: POV,
    tense?: Tense
  ): Promise<AgenticRetrievalResult> {
    const sessionId = crypto.randomUUID();
    const queriedChapters: number[] = [];

    log('Starting agentic retrieval', {
      sessionId,
      userInputLength: context.userInput.length,
      chaptersCount: context.chapters.length,
      entriesCount: context.entries.length,
    });

    // Build initial prompt
    const initialPrompt = this.buildInitialPrompt(context, mode, pov, tense);

    // Initialize conversation
    const messages: AgenticMessage[] = [
      { role: 'system', content: promptService.renderPrompt('agentic-retrieval', this.getPromptContext(mode, pov, tense)) },
      { role: 'user', content: initialPrompt },
    ];

    let complete = false;
    let iterations = 0;
    let retrievedContext = '';
    let consecutiveNoToolCalls = 0;
    const MAX_NO_TOOL_CALL_RETRIES = 2;

    while (!complete && iterations < this.maxIterations) {
      if (signal?.aborted) {
        log('Agentic retrieval aborted before iteration');
        break;
      }

      iterations++;
      log(`Retrieval iteration ${iterations}/${this.maxIterations}`);

      try {
        const response = await this.provider.generateWithTools({
          messages,
          model: this.model,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          tools: RETRIEVAL_TOOLS,
          tool_choice: 'auto',
          extraBody: this.extraBody,
          signal,
        });

        log('Retrieval agent response', {
          hasContent: !!response.content,
          hasToolCalls: !!response.tool_calls,
          toolCallCount: response.tool_calls?.length ?? 0,
          finishReason: response.finish_reason,
          hasReasoning: !!response.reasoning,
          hasReasoningDetails: !!response.reasoning_details,
        });

        if (response.reasoning) {
          log('Agent reasoning:', response.reasoning.substring(0, 500));
        }

        // If no tool calls, prompt the agent to use tools or finish
        if (!response.tool_calls || response.tool_calls.length === 0) {
          consecutiveNoToolCalls++;
          log(`No tool calls (${consecutiveNoToolCalls}/${MAX_NO_TOOL_CALL_RETRIES})`);

          if (response.content) {
            messages.push({
              role: 'assistant',
              content: response.content,
              reasoning: response.reasoning ?? null,
              reasoning_details: response.reasoning_details,
            });
          }

          if (consecutiveNoToolCalls >= MAX_NO_TOOL_CALL_RETRIES) {
            log('Max no-tool-call retries reached, ending retrieval');
            break;
          }

          messages.push({
            role: 'user',
            content: promptService.getPrompt('agentic-retrieval-retry', this.getPromptContext(mode, pov, tense)),
          });
          continue;
        }

        consecutiveNoToolCalls = 0;

        // Add assistant response to messages
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
          reasoning: response.reasoning ?? null,
          reasoning_details: response.reasoning_details,
        });

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          const result = await this.executeTool(
            toolCall,
            context,
            queriedChapters,
            onQueryChapter,
            onQueryChapters
          );

          if (toolCall.function.name === 'finish_retrieval') {
            complete = true;
            const args = parseJsonWithHealing<Record<string, any>>(toolCall.function.arguments);
            retrievedContext = args.summary;
          }

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          log('Agentic retrieval aborted');
          break;
        }
        log('Error in retrieval iteration:', error);
        break;
      }
    }

    if (iterations >= this.maxIterations) {
      log('Max iterations reached');
    }

    log('Agentic retrieval complete', {
      sessionId,
      iterations,
      queriedChaptersCount: queriedChapters.length,
      contextLength: retrievedContext.length,
    });

    return {
      context: retrievedContext,
      queriedChapters,
      iterations,
      sessionId,
    };
  }

  private buildInitialPrompt(context: AgenticRetrievalContext, mode: StoryMode = 'adventure', pov?: POV, tense?: Tense): string {
    const promptContext = this.getPromptContext(mode, pov, tense);

    // Format recent context
    const recentContext = context.recentEntries.slice(-AI_CONFIG.context.recentEntriesForRetrieval).map(e => {
      const prefix = e.type === 'user_action' ? '[ACTION]' : '[NARRATION]';
      return `${prefix} ${e.content}`;
    }).join('\n\n');

    const chapterList = context.chapters.length > 0
      ? context.chapters.map(c => `- Chapter ${c.number}: ${c.title || 'Untitled'} (${c.characters.join(', ')})`).join('\n')
      : '(none)';

    const maxPreview = AI_CONFIG.lorebook.maxForAgenticPreview;
    const entryList = context.entries.length > 0
      ? context.entries.slice(0, maxPreview).map(e => `- ${e.name} (${e.type})`).join('\n')
      : '(none)';
    const entryOverflow = context.entries.length > maxPreview
      ? `...and ${context.entries.length - maxPreview} more`
      : '';

    return promptService.renderUserPrompt('agentic-retrieval', promptContext, {
      userInput: context.userInput,
      recentContext,
      chaptersCount: context.chapters.length,
      chapterList,
      entriesCount: context.entries.length,
      entryList: `${entryList}${entryOverflow ? `\n${entryOverflow}` : ''}`,
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

  private async executeTool(
    toolCall: ToolCall,
    context: AgenticRetrievalContext,
    queriedChapters: number[],
    onQueryChapter?: (chapterNumber: number, question: string) => Promise<string>,
    onQueryChapters?: (startChapter: number, endChapter: number, question: string) => Promise<string>
  ): Promise<string> {
    const args = parseJsonWithHealing<Record<string, any>>(toolCall.function.arguments);
    log('Executing retrieval tool:', toolCall.function.name, args);

    switch (toolCall.function.name) {
      case 'list_chapters': {
        return JSON.stringify(context.chapters.map(c => ({
          number: c.number,
          title: c.title,
          summary: c.summary,
          characters: c.characters,
          locations: c.locations,
          plotThreads: c.plotThreads,
        })));
      }

      case 'query_chapter': {
        const chapterNum = args.chapter_number;
        const question = args.question;

        // Track queried chapters
        if (!queriedChapters.includes(chapterNum)) {
          queriedChapters.push(chapterNum);
        }

        const chapter = context.chapters.find(c => c.number === chapterNum);
        if (!chapter) {
          return JSON.stringify({ error: `Chapter ${chapterNum} not found` });
        }

        // If we have a query callback, use it for AI-powered answers
        if (onQueryChapter) {
          try {
            const answer = await onQueryChapter(chapterNum, question);
            return JSON.stringify({
              chapter: chapterNum,
              question,
              answer,
            });
          } catch (error) {
            log('Query chapter failed, falling back to summary:', error);
          }
        }

        // Fallback: return summary
        return JSON.stringify({
          chapter: chapterNum,
          question,
          answer: `Based on chapter summary: ${chapter.summary}`,
          characters: chapter.characters,
          locations: chapter.locations,
        });
      }

      case 'query_chapters': {
        const startChapter = args.start_chapter;
        const endChapter = Math.min(args.end_chapter, startChapter + 2);
        const question = args.question;

        const chapters = context.chapters.filter(
          c => c.number >= startChapter && c.number <= endChapter
        );

        // Track queried chapters
        for (const c of chapters) {
          if (!queriedChapters.includes(c.number)) {
            queriedChapters.push(c.number);
          }
        }

        if (chapters.length === 0) {
          return JSON.stringify({ error: 'No chapters in specified range' });
        }

        if (onQueryChapters) {
          try {
            const answer = await onQueryChapters(startChapter, endChapter, question);
            return JSON.stringify({
              range: { start: startChapter, end: endChapter },
              question,
              answer,
            });
          } catch (error) {
            log('Query chapters failed, falling back to summaries:', error);
          }
        }

        const combinedSummaries = chapters.map(c =>
          `Chapter ${c.number}: ${c.summary}`
        ).join('\n\n');

        return JSON.stringify({
          range: { start: startChapter, end: endChapter },
          question,
          answer: `Based on chapters ${startChapter}-${endChapter}:\n${combinedSummaries}`,
        });
      }

      case 'list_entries': {
        const typeFilter = args.type;
        const filtered = typeFilter
          ? context.entries.filter(e => e.type === typeFilter)
          : context.entries;

        return JSON.stringify(filtered.map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
          description: e.description,
          aliases: e.aliases,
        })));
      }

      case 'finish_retrieval': {
        return JSON.stringify({
          success: true,
          message: 'Retrieval complete',
          summary_length: args.summary.length,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
    }
  }

  /**
   * Build a context block from retrieval results for injection into narrator prompt.
   */
  static formatForPromptInjection(result: AgenticRetrievalResult): string {
    if (!result.context || result.context.length === 0) {
      return '';
    }

    return `
<retrieved_context>
## From Earlier in the Story
${result.context}
</retrieved_context>`;
  }
}

// Settings interface
export interface AgenticRetrievalSettings {
  enabled: boolean;
  model: string;
  temperature: number;
  maxIterations: number;
  systemPrompt: string;
  // Threshold for when to use agentic retrieval instead of static
  agenticThreshold: number; // Use agentic if chapters > N (default: 30)
  reasoningEffort: ReasoningEffort;
  providerOnly: string[];
  manualBody: string;
}

export function getDefaultAgenticRetrievalSettings(): AgenticRetrievalSettings {
  return {
    enabled: false, // Disabled by default, static retrieval is usually sufficient
    model: 'minimax/minimax-m2.1',
    temperature: 0.3,
    maxIterations: 10,
    systemPrompt: '', // Uses centralized prompt system (template id: 'agentic-retrieval')
    agenticThreshold: 30,
    reasoningEffort: 'high',
    providerOnly: ['minimax'],
    manualBody: '',
  };
}
