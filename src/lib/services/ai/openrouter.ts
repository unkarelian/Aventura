import type { APISettings } from '$lib/types';
import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  StreamChunk,
  ModelInfo,
  ProviderInfo,
  Message,
  AgenticRequest,
  AgenticResponse,
  Tool,
  ToolCall,
  AgenticMessage,
  AgenticStreamChunk,
  ReasoningDetail,
} from './types';
import { settings } from '$lib/stores/settings.svelte';
import { ui } from '$lib/stores/ui.svelte';
import { fetch } from '@tauri-apps/plugin-http';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/' //Used as the default.
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[OpenRouter]', ...args);
  }
}

export class OpenAIProvider implements AIProvider {
  id = 'openrouter';
  name = 'OpenRouter';

  private settings: APISettings

  constructor(settings: APISettings ) {
    this.settings = settings
  }

  async generateResponse(request: GenerationRequest): Promise<GenerationResponse> {
    log('generateResponse called', {
      model: request.model,
      messagesCount: request.messages.length,
      temperature: request.temperature,
      topP: request.topP,
      maxTokens: request.maxTokens,
    });

    const requestBody: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens ?? 8192,
      stop: request.stopSequences,
      top_p: request.topP,
      response_format: request.responseFormat,
      ...request.extraBody, // Spread provider-specific options (e.g., reasoning)
    };

    log('Sending request to OpenRouter...');

    // Ensure base URL has trailing slash for proper URL construction
    const baseUrl = this.settings.openaiApiURL.endsWith('/')
      ? this.settings.openaiApiURL
      : this.settings.openaiApiURL + '/';

    // Debug logging - log request if debug mode enabled
    const startTime = Date.now();
    let debugRequestId: string | undefined;
    if (settings.uiSettings.debugMode) {
      debugRequestId = ui.addDebugRequest('generateResponse', {
        url: baseUrl + 'chat/completions',
        method: 'POST',
        body: requestBody,
      });
    }

    // Create timeout controller (3 minutes)
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Request timeout triggered (3 minutes)');
      timeoutController.abort();
    }, 180000);

    // If caller provided a signal, link it to our timeout controller
    if (request.signal) {
      request.signal.addEventListener('abort', () => timeoutController.abort());
    }

    try {
      const response = await fetch(baseUrl + 'chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'HTTP-Referer': 'https://aventura.camp',
          'X-Title': 'Aventura',
        },
        body: JSON.stringify(requestBody),
        signal: timeoutController.signal,
      });

      clearTimeout(timeoutId);

      log('Response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const error = await response.text();
        log('API error', { status: response.status, error });
        // Debug logging - log error response
        if (settings.uiSettings.debugMode && debugRequestId) {
          ui.addDebugResponse(debugRequestId, 'generateResponse', { status: response.status, error }, startTime, error);
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      log('Response parsed', {
        model: data.model,
        contentLength: data.choices[0]?.message?.content?.length ?? 0,
        usage: data.usage,
      });

      // Debug logging - log success response
      if (settings.uiSettings.debugMode && debugRequestId) {
        ui.addDebugResponse(debugRequestId, 'generateResponse', data, startTime);
      }

      return {
        content: data.choices[0]?.message?.content ?? '',
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if it was a timeout vs user abort
        if (request.signal?.aborted) {
          throw error; // User aborted, re-throw as-is
        }
        throw new Error('Request timed out after 3 minutes');
      }
      throw error;
    }
  }

  /**
   * Generate a response with tool calling support.
   * Used for agentic flows (Lore Management, Agentic Retrieval, etc.)
   */
  async generateWithTools(request: AgenticRequest): Promise<AgenticResponse> {
    log('generateWithTools called', {
      model: request.model,
      messagesCount: request.messages.length,
      toolsCount: request.tools.length,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    const requestBody: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 8192,
      tools: request.tools,
      tool_choice: request.tool_choice ?? 'auto',
      ...request.extraBody,
    };

    log('Sending tool-enabled request to OpenRouter...');

    // Ensure base URL has trailing slash for proper URL construction
    const baseUrl = this.settings.openaiApiURL.endsWith('/')
      ? this.settings.openaiApiURL
      : this.settings.openaiApiURL + '/';

    // Debug logging - log request if debug mode enabled
    const startTime = Date.now();
    let debugRequestId: string | undefined;
    if (settings.uiSettings.debugMode) {
      debugRequestId = ui.addDebugRequest('generateWithTools', {
        url: baseUrl + 'chat/completions',
        method: 'POST',
        body: requestBody,
      });
    }

    // Create timeout controller (3 minutes)
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Tool request timeout triggered (3 minutes)');
      timeoutController.abort();
    }, 180000);

    // If caller provided a signal, link it to our timeout controller
    if (request.signal) {
      request.signal.addEventListener('abort', () => timeoutController.abort());
    }

    try {
      const response = await fetch(baseUrl + 'chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'HTTP-Referer': 'https://aventura.camp',
          'X-Title': 'Aventura',
        },
        body: JSON.stringify(requestBody),
        signal: timeoutController.signal,
      });

      clearTimeout(timeoutId);

      log('Tool response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const error = await response.text();
        log('Tool API error', { status: response.status, error });
        // Debug logging - log error response
        if (settings.uiSettings.debugMode && debugRequestId) {
          ui.addDebugResponse(debugRequestId, 'generateWithTools', { status: response.status, error }, startTime, error);
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice?.message;

      log('Tool response parsed', {
        model: data.model,
        finishReason: choice?.finish_reason,
        hasToolCalls: !!message?.tool_calls,
        toolCallCount: message?.tool_calls?.length ?? 0,
        contentLength: message?.content?.length ?? 0,
        hasReasoning: !!message?.reasoning,
        reasoningLength: message?.reasoning?.length ?? 0,
        hasReasoningDetails: !!message?.reasoning_details,
        reasoningDetailsCount: message?.reasoning_details?.length ?? 0,
      });

      // Extract legacy reasoning string if present (for backwards compatibility)
      let reasoning: string | undefined;
      if (message?.reasoning) {
        reasoning = message.reasoning;
      } else if (data.reasoning) {
        // Fallback to top-level reasoning if present
        reasoning = data.reasoning;
      }

      // Extract reasoning_details array if present (for preserving reasoning across tool calls)
      // Per OpenRouter docs: This is required for models like MiniMax M2.1, Claude 3.7+, OpenAI o-series
      // https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
      const reasoning_details = message?.reasoning_details ?? undefined;

      // Parse tool calls if present
      const toolCalls: ToolCall[] | undefined = message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

      // Debug logging - log success response
      if (settings.uiSettings.debugMode && debugRequestId) {
        ui.addDebugResponse(debugRequestId, 'generateWithTools', data, startTime);
      }

      return {
        content: message?.content ?? null,
        model: data.model,
        tool_calls: toolCalls,
        finish_reason: choice?.finish_reason ?? 'stop',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          reasoningTokens: data.usage.reasoning_tokens,
        } : undefined,
        reasoning,
        reasoning_details,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if it was a timeout vs user abort
        if (request.signal?.aborted) {
          throw error; // User aborted, re-throw as-is
        }
        throw new Error('Request timed out after 3 minutes');
      }
      throw error;
    }
  }

  /**
   * Stream a response with tool calling support.
   * Yields events as they arrive: reasoning, content, and tool calls.
   * Per OpenRouter docs, reasoning_details arrives via delta.reasoning_details.
   */
  async *streamWithTools(request: AgenticRequest): AsyncGenerator<AgenticStreamChunk> {
    log('streamWithTools called', {
      model: request.model,
      messagesCount: request.messages.length,
      toolsCount: request.tools.length,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });

    const requestBody: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 8192,
      tools: request.tools,
      tool_choice: request.tool_choice ?? 'auto',
      stream: true,
      ...request.extraBody,
    };

    log('Sending streaming tool-enabled request...');

    // Ensure base URL has trailing slash
    const baseUrl = this.settings.openaiApiURL.endsWith('/')
      ? this.settings.openaiApiURL
      : this.settings.openaiApiURL + '/';

    // Debug logging
    const startTime = Date.now();
    let debugRequestId: string | undefined;
    if (settings.uiSettings.debugMode) {
      debugRequestId = ui.addDebugRequest('streamWithTools', {
        url: baseUrl + 'chat/completions',
        method: 'POST',
        body: requestBody,
      });
    }

    // Create timeout controller (3 minutes for connection)
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Stream connection timeout triggered (3 minutes)');
      timeoutController.abort();
    }, 180000);

    if (request.signal) {
      request.signal.addEventListener('abort', () => timeoutController.abort());
    }

    let response: Response;
    try {
      response = await fetch(baseUrl + 'chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'HTTP-Referer': 'https://aventura.camp',
          'X-Title': 'Aventura',
        },
        body: JSON.stringify(requestBody),
        signal: timeoutController.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        if (request.signal?.aborted) {
          throw error;
        }
        throw new Error('Stream connection timed out after 3 minutes');
      }
      throw error;
    }

    clearTimeout(timeoutId);

    log('Stream response received', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await response.text();
      log('Stream API error', { status: response.status, error });
      if (settings.uiSettings.debugMode && debugRequestId) {
        ui.addDebugResponse(debugRequestId, 'streamWithTools', { status: response.status, error }, startTime, error);
      }
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    log('Starting to read tool-enabled stream...');

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    // Accumulated state for building final response
    let accumulatedContent = '';
    let accumulatedReasoning = '';
    const accumulatedReasoningDetails: ReasoningDetail[] = [];
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
    let finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' = 'stop';
    let model = request.model;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        log('Stream reader done');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            log('Received [DONE] signal');

            // Build final tool calls array
            const toolCalls: ToolCall[] = Array.from(toolCallsMap.entries())
              .sort(([a], [b]) => a - b)
              .map(([_, tc]) => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              }));

            // Debug logging
            if (settings.uiSettings.debugMode && debugRequestId) {
              ui.addDebugResponse(debugRequestId, 'streamWithTools', {
                content: accumulatedContent,
                toolCalls: toolCalls.length,
                reasoningDetails: accumulatedReasoningDetails.length,
                chunks: chunkCount,
                streaming: true,
              }, startTime);
            }

            // Yield final response
            yield {
              type: 'done',
              response: {
                content: accumulatedContent || null,
                model,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                finish_reason: finishReason,
                reasoning: accumulatedReasoning || undefined,
                reasoning_details: accumulatedReasoningDetails.length > 0 ? accumulatedReasoningDetails : undefined,
              },
            };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            chunkCount++;

            // Log first few chunks to debug what we're getting
            if (chunkCount <= 5) {
              log('Stream chunk #' + chunkCount + ':', JSON.stringify(parsed).substring(0, 200));
            }

            // Update model from response
            if (parsed.model) {
              model = parsed.model;
            }

            const choice = parsed.choices?.[0];
            if (!choice) continue;

            // Update finish reason
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }

            const delta = choice.delta;
            if (!delta) continue;

            // Log delta contents on first few chunks
            if (chunkCount <= 5) {
              log('Delta keys:', Object.keys(delta).join(', '));
            }

            // Handle reasoning - prefer reasoning_details, fallback to legacy reasoning field
            // Only use one to avoid double-yielding the same content
            const hasReasoningDetails = delta.reasoning_details && Array.isArray(delta.reasoning_details) && delta.reasoning_details.length > 0;

            if (hasReasoningDetails) {
              for (const detail of delta.reasoning_details) {
                if (detail.type === 'reasoning.text' && detail.text) {
                  const text = detail.text;
                  // Some providers (Z.AI) insert erroneous newlines between tokens
                  // Filter out chunks that are just whitespace/newlines
                  if (text.trim() === '') {
                    // Skip pure whitespace chunks entirely - don't accumulate or yield
                    continue;
                  }
                  log('Streaming reasoning_details.text chunk:', JSON.stringify(text.substring(0, 50)));
                  yield { type: 'reasoning', content: text };
                  accumulatedReasoning += text;
                  accumulatedReasoningDetails.push(detail);
                } else {
                  // Non-text details (summary, encrypted) - keep them
                  accumulatedReasoningDetails.push(detail);
                }
              }
            } else if (delta.reasoning) {
              // Only use legacy reasoning if reasoning_details not present
              const text = delta.reasoning;
              // Filter out pure whitespace chunks (don't yield, but still process content below)
              if (text.trim() !== '') {
                log('Streaming legacy reasoning chunk:', JSON.stringify(text.substring(0, 50)));
                yield { type: 'reasoning', content: text };
                accumulatedReasoning += text;
              }
            }

            // Handle content
            if (delta.content) {
              yield { type: 'content', content: delta.content };
              accumulatedContent += delta.content;
            }

            // Handle tool calls (streamed incrementally)
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? 0;

                if (!toolCallsMap.has(index)) {
                  // New tool call
                  toolCallsMap.set(index, {
                    id: tc.id || '',
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  });

                  if (tc.id && tc.function?.name) {
                    yield { type: 'tool_call_start', id: tc.id, name: tc.function.name };
                  }
                } else {
                  // Update existing tool call
                  const existing = toolCallsMap.get(index)!;
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments;
                    yield { type: 'tool_call_args', id: existing.id, args: tc.function.arguments };
                  }
                }
              }
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
            log('JSON parse error (may be incomplete):', data.substring(0, 50));
          }
        }
      }
    }

    // Handle case where stream ended without [DONE]
    const toolCalls: ToolCall[] = Array.from(toolCallsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, tc]) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      }));

    if (settings.uiSettings.debugMode && debugRequestId) {
      ui.addDebugResponse(debugRequestId, 'streamWithTools', {
        content: accumulatedContent,
        toolCalls: toolCalls.length,
        reasoningDetails: accumulatedReasoningDetails.length,
        chunks: chunkCount,
        streaming: true,
      }, startTime);
    }

    yield {
      type: 'done',
      response: {
        content: accumulatedContent || null,
        model,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        finish_reason: finishReason,
        reasoning: accumulatedReasoning || undefined,
        reasoning_details: accumulatedReasoningDetails.length > 0 ? accumulatedReasoningDetails : undefined,
      },
    };

    log('Stream finished', { totalChunks: chunkCount });
  }

  async *streamResponse(request: GenerationRequest): AsyncIterable<StreamChunk> {
    log('streamResponse called', {
      model: request.model,
      messagesCount: request.messages.length,
      temperature: request.temperature,
      topP: request.topP,
      maxTokens: request.maxTokens,
    });

    log('Sending streaming request to OpenRouter...');

    const requestBody: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens ?? 8192,
      stop: request.stopSequences,
      stream: true,
      top_p: request.topP,
      response_format: request.responseFormat,
      ...request.extraBody, // Spread provider-specific options (e.g., reasoning)
    };

    // Ensure base URL has trailing slash for proper URL construction
    const baseUrl = this.settings.openaiApiURL.endsWith('/')
      ? this.settings.openaiApiURL
      : this.settings.openaiApiURL + '/';

    // Debug logging - log request if debug mode enabled
    const startTime = Date.now();
    let debugRequestId: string | undefined;
    if (settings.uiSettings.debugMode) {
      debugRequestId = ui.addDebugRequest('streamResponse', {
        url: baseUrl + 'chat/completions',
        method: 'POST',
        body: requestBody,
      });
    }

    // Create timeout controller for initial connection (3 minutes)
    // Once streaming starts, we clear the timeout as streaming can take longer
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Stream connection timeout triggered (3 minutes)');
      timeoutController.abort();
    }, 180000);

    // If caller provided a signal, link it to our timeout controller
    if (request.signal) {
      request.signal.addEventListener('abort', () => timeoutController.abort());
    }

    let response: Response;
    try {
      response = await fetch(baseUrl + 'chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'HTTP-Referer': 'https://aventura.camp',
          'X-Title': 'Aventura',
        },
        body: JSON.stringify(requestBody),
        signal: timeoutController.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        if (request.signal?.aborted) {
          throw error; // User aborted
        }
        throw new Error('Stream connection timed out after 3 minutes');
      }
      throw error;
    }

    // Connection established, clear the timeout - streaming can take longer
    clearTimeout(timeoutId);

    log('Stream response received', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await response.text();
      log('Stream API error', { status: response.status, error });
      // Debug logging - log error response
      if (settings.uiSettings.debugMode && debugRequestId) {
        ui.addDebugResponse(debugRequestId, 'streamResponse', { status: response.status, error }, startTime, error);
      }
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      log('No response body available');
      throw new Error('No response body');
    }

    log('Starting to read stream...');

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let fullContent = ''; // Accumulate content for debug logging
    let fullReasoning = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        log('Stream reader done');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            log('Received [DONE] signal');
            // Debug logging - log accumulated response
            if (settings.uiSettings.debugMode && debugRequestId) {
              ui.addDebugResponse(debugRequestId, 'streamResponse', {
                content: fullContent,
                reasoning: fullReasoning,
                chunks: chunkCount,
                streaming: true,
              }, startTime);
            }
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;

            const content = delta?.content ?? '';
            const reasoning = delta?.reasoning_details?.reduce((acc: string, detail: { text: string; }) => acc + detail.text, '') || delta?.reasoning || '';

            if (content || reasoning) {
              chunkCount++;
              if (content) fullContent += content;
              if (reasoning) fullReasoning += reasoning;

              if (chunkCount <= 3) {
                log('Stream chunk received', {
                  chunkCount,
                  contentLength: content.length,
                  reasoningLength: reasoning.length
                });
              }

              yield { content, reasoning: reasoning || undefined, done: false };
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
            log('JSON parse error (may be incomplete):', data.substring(0, 50));
          }
        }
      }
    }

    // Debug logging - log accumulated response if stream ended without [DONE]
    if (settings.uiSettings.debugMode && debugRequestId) {
      ui.addDebugResponse(debugRequestId, 'streamResponse', {
        content: fullContent,
        chunks: chunkCount,
        streaming: true,
      }, startTime);
    }

    log('Stream finished', { totalChunks: chunkCount });
  }

  async listModels(): Promise<ModelInfo[]> {
    log('listModels called');

    // The models endpoint is public and doesn't require authentication
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Request timeout triggered');
      controller.abort();
    }, 15000); // 15 second timeout

    try {
      log('Fetching models from OpenRouter API...');

      // Ensure base URL has trailing slash for proper URL construction
      const baseUrl = this.settings.openaiApiURL.endsWith('/')
        ? this.settings.openaiApiURL
        : this.settings.openaiApiURL + '/';

      const response = await fetch(baseUrl + 'models', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      log('Models response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        log('Models API error', { status: response.status, error: errorText });
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const json = await response.json();

      if (!json.data || !Array.isArray(json.data)) {
        log('Unexpected API response structure', { keys: Object.keys(json) });
        throw new Error('Invalid API response structure');
      }

      log('Models fetched successfully', { count: json.data.length });

      return json.data.map((model: any) => ({
        id: model.id,
        name: model.name ?? model.id,
        description: model.description ?? '',
        contextLength: model.context_length ?? model.top_provider?.context_length ?? 4096,
        pricing: model.pricing ? {
          prompt: parseFloat(model.pricing.prompt) || 0,
          completion: parseFloat(model.pricing.completion) || 0,
        } : undefined,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        log('Request timed out after 15 seconds');
        throw new Error('Request timed out');
      }
      log('listModels error', error);
      throw error;
    }
  }

  async listProviders(): Promise<ProviderInfo[]> {
    log('listProviders called');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Request timeout triggered');
      controller.abort();
    }, 15000);

    try {
      log('Fetching providers from OpenRouter API...');

      const baseUrl = this.settings.openaiApiURL.endsWith('/')
        ? this.settings.openaiApiURL
        : this.settings.openaiApiURL + '/';

      const response = await fetch(baseUrl + 'providers', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      log('Providers response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        log('Providers API error', { status: response.status, error: errorText });
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const json = await response.json();

      if (!json.data || !Array.isArray(json.data)) {
        log('Unexpected providers API response structure', { keys: Object.keys(json) });
        throw new Error('Invalid providers API response structure');
      }

      log('Providers fetched successfully', { count: json.data.length });

      return json.data.map((provider: any) => ({
        name: provider.name,
        slug: provider.slug,
        privacyPolicyUrl: provider.privacy_policy_url ?? null,
        termsOfServiceUrl: provider.terms_of_service_url ?? null,
        statusPageUrl: provider.status_page_url ?? null,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        log('Request timed out after 15 seconds');
        throw new Error('Request timed out');
      }
      log('listProviders error', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}
