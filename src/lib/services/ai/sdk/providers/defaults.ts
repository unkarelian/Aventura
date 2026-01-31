/**
 * Provider Defaults Configuration
 *
 * Defines default models and settings for each provider type.
 * Used when creating presets, resetting to defaults, or first-time setup.
 */

import type { ProviderType, ReasoningEffort } from '$lib/types';

/**
 * OpenRouter API URL constant.
 * Used throughout the app for OpenRouter-based profiles.
 */
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/**
 * NanoGPT API URL constant.
 */
export const NANOGPT_API_URL = 'https://nano-gpt.com/api/v1';

/**
 * Provider capabilities - what each provider supports.
 */
export interface ProviderCapabilities {
  supportsTextGeneration: boolean;
  supportsImageGeneration: boolean;
}

/**
 * Provider capabilities lookup.
 */
export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapabilities> = {
  openrouter:   { supportsTextGeneration: true,  supportsImageGeneration: false },
  openai:       { supportsTextGeneration: true,  supportsImageGeneration: true },
  anthropic:    { supportsTextGeneration: true,  supportsImageGeneration: false },
  google:       { supportsTextGeneration: true,  supportsImageGeneration: true },
  nanogpt:      { supportsTextGeneration: true,  supportsImageGeneration: true },
  chutes:       { supportsTextGeneration: true,  supportsImageGeneration: true },
  pollinations: { supportsTextGeneration: true,  supportsImageGeneration: true },
};

/**
 * Image model defaults for providers that support image generation.
 */
export interface ImageModelDefaults {
  defaultModel: string;
  referenceModel: string;  // Model that supports image-to-image
  supportedSizes: string[];
}

/**
 * Image model defaults per provider.
 */
export const IMAGE_MODEL_DEFAULTS: Partial<Record<ProviderType, ImageModelDefaults>> = {
  openai: {
    defaultModel: 'dall-e-3',
    referenceModel: 'dall-e-2',  // DALL-E 2 supports image editing
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
  },
  google: {
    defaultModel: 'imagen-3.0-generate-002',
    referenceModel: 'imagen-3.0-generate-002',
    supportedSizes: ['512x512', '1024x1024'],
  },
  nanogpt: {
    defaultModel: 'z-image-turbo',
    referenceModel: 'qwen-image',
    supportedSizes: ['512x512', '1024x1024', '2048x2048'],
  },
  chutes: {
    defaultModel: 'z-image-turbo',
    referenceModel: 'qwen-image-edit-2511',
    supportedSizes: ['576x576', '1024x1024', '2048x2048'],
  },
  pollinations: {
    defaultModel: 'flux',
    referenceModel: 'kontext',
    supportedSizes: ['512x512', '1024x1024', '2048x2048'],
  },
};

/**
 * Default model configuration for a service category.
 */
export interface ServiceModelDefaults {
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort: ReasoningEffort;
}

/**
 * All service defaults for a provider.
 */
export interface ProviderDefaults {
  /** Provider display name */
  name: string;
  /** Default base URL (empty = use SDK default) */
  baseUrl: string;
  /** Default model for main narrative generation */
  narrative: ServiceModelDefaults;
  /** Default model for classification tasks (world state, entity extraction) */
  classification: ServiceModelDefaults;
  /** Default model for memory/context tasks (summarization, retrieval) */
  memory: ServiceModelDefaults;
  /** Default model for suggestions/creative tasks */
  suggestions: ServiceModelDefaults;
  /** Default model for agentic tasks (tool-calling, autonomous) */
  agentic: ServiceModelDefaults;
  /** Default model for wizard/generation tasks */
  wizard: ServiceModelDefaults;
  /** Default model for translation */
  translation: ServiceModelDefaults;
}

/**
 * Provider-specific default configurations.
 */
export const PROVIDER_DEFAULTS: Record<ProviderType, ProviderDefaults> = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    narrative: {
      model: 'anthropic/claude-sonnet-4',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'x-ai/grok-4.1-fast',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'high',
    },
    memory: {
      model: 'x-ai/grok-4.1-fast',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'high',
    },
    suggestions: {
      model: 'deepseek/deepseek-chat',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'anthropic/claude-sonnet-4',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'high',
    },
    wizard: {
      model: 'deepseek/deepseek-chat',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'deepseek/deepseek-chat',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  openai: {
    name: 'OpenAI',
    baseUrl: '', // SDK default
    narrative: {
      model: 'gpt-4o',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  anthropic: {
    name: 'Anthropic',
    baseUrl: '', // SDK default
    narrative: {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'claude-haiku-4-20250514',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'claude-haiku-4-20250514',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'claude-haiku-4-20250514',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'claude-haiku-4-20250514',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'claude-haiku-4-20250514',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  google: {
    name: 'Google AI',
    baseUrl: '', // SDK default
    narrative: {
      model: 'gemini-2.0-flash',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  nanogpt: {
    name: 'NanoGPT',
    baseUrl: 'https://nano-gpt.com/api/v1',
    narrative: {
      model: 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'deepseek-chat',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  chutes: {
    name: 'Chutes',
    baseUrl: '', // SDK default
    narrative: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'deepseek-ai/DeepSeek-V3-0324',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },

  pollinations: {
    name: 'Pollinations',
    baseUrl: '', // SDK default
    narrative: {
      model: 'openai',
      temperature: 0.8,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    classification: {
      model: 'openai',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    memory: {
      model: 'openai',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    suggestions: {
      model: 'openai',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    agentic: {
      model: 'openai',
      temperature: 0.3,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    wizard: {
      model: 'openai',
      temperature: 0.7,
      maxTokens: 8192,
      reasoningEffort: 'off',
    },
    translation: {
      model: 'openai',
      temperature: 0.3,
      maxTokens: 4096,
      reasoningEffort: 'off',
    },
  },
};
