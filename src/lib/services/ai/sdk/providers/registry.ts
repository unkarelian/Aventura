/**
 * Provider Registry
 *
 * The single entry point for getting Vercel AI SDK providers.
 * Supports explicit provider selection from APIProfile.providerType.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createChutes } from '@chutes-ai/ai-sdk-provider';
import { createPollinations } from 'ai-sdk-pollinations';
import { createTimeoutFetch } from './fetch';
import { NANOGPT_API_URL } from './defaults';
import type { APIProfile, ProviderType } from '$lib/types';

/** Default HTTP timeout for API requests (3 minutes) */
const DEFAULT_TIMEOUT_MS = 180000;

/**
 * Default base URLs for each provider.
 * Used when profile.baseUrl is not specified.
 */
const DEFAULT_BASE_URLS: Record<ProviderType, string | undefined> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: undefined,  // undefined = SDK default (api.openai.com) - also works for NIM, local LLMs, etc.
  anthropic: undefined,  // undefined = SDK default (api.anthropic.com)
  google: undefined,  // Google uses SDK default
  nanogpt: NANOGPT_API_URL,
  chutes: undefined,  // SDK default
  pollinations: undefined,  // SDK default
};

/**
 * Create a Vercel AI SDK provider from an APIProfile.
 *
 * This is THE main function for getting a provider ready for any SDK function.
 * The returned provider can be passed to generateText, streamText, tools, etc.
 *
 * All providers support optional custom baseUrl for:
 * - Local LLMs (Ollama, LM Studio, etc.)
 * - Azure OpenAI
 * - Custom deployments
 *
 * @param profile - The API profile with providerType and credentials
 * @returns A configured provider instance
 *
 * @example
 * ```typescript
 * const profile = settings.getProfile(profileId);
 * const provider = createProviderFromProfile(profile);
 * const model = provider.chat('gpt-4o');
 *
 * const result = await generateText({ model, prompt: '...' });
 * ```
 */
export function createProviderFromProfile(profile: APIProfile) {
  const fetch = createTimeoutFetch(DEFAULT_TIMEOUT_MS);
  const baseURL = profile.baseUrl || DEFAULT_BASE_URLS[profile.providerType];

  switch (profile.providerType) {
    case 'openrouter':
      return createOpenRouter({
        apiKey: profile.apiKey,
        baseURL: baseURL ?? 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://aventura.camp',
          'X-Title': 'Aventura',
        },
        fetch,
      });

    case 'openai':
      return createOpenAI({
        apiKey: profile.apiKey,
        baseURL,  // undefined = default OpenAI endpoint
        fetch,
      });

    case 'anthropic':
      return createAnthropic({
        apiKey: profile.apiKey,
        baseURL,
        fetch,
      });

    case 'google':
      // Future: import { createGoogleGenerativeAI } from '@ai-sdk/google'
      throw new Error('Google provider not yet implemented');

    case 'nanogpt':
      // NanoGPT is OpenAI-compatible with custom base URL
      return createOpenAI({
        apiKey: profile.apiKey,
        baseURL: baseURL ?? NANOGPT_API_URL,
        fetch,
      });

    case 'chutes':
      return createChutes({
        apiKey: profile.apiKey,
      });

    case 'pollinations':
      return createPollinations({
        apiKey: profile.apiKey || undefined,  // Pollinations works without API key
      });

    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = profile.providerType;
      throw new Error(`Unknown provider type: ${_exhaustive}`);
    }
  }
}
