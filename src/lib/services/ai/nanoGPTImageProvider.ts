/**
 * NanoGPT Image Provider
 *
 * Implementation of ImageProvider for NanoGPT's image generation API.
 * API Documentation: https://nano-gpt.com/docs
 */

import type {
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageModelInfo,
} from './imageProvider';
import { ImageGenerationError } from './imageProvider';
import { settings } from '$lib/stores/settings.svelte';

const NANOGPT_BASE_URL = 'https://nano-gpt.com';
const NANOGPT_API_V1 = `${NANOGPT_BASE_URL}/api/v1`;
const NANOGPT_IMAGES_ENDPOINT = `${NANOGPT_BASE_URL}/v1/images/generations`;
const NANOGPT_MODELS_ENDPOINT = `${NANOGPT_BASE_URL}/api/models`;

// Fallback model if API doesn't return models
const FALLBACK_MODEL = 'z-image-turbo';

export class NanoGPTImageProvider implements ImageProvider {
  id = 'nanogpt';
  name = 'NanoGPT';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (settings.uiSettings.debugMode) {
      console.log('[NanoGPT] Generating image with request:', {
        model: request.model,
        size: request.size,
        n: request.n,
        promptLength: request.prompt.length,
        hasReferenceImages: !!request.imageDataUrls?.length,
      });
    }

    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model: request.model || FALLBACK_MODEL,
      n: request.n ?? 1,
      size: request.size ?? '1024x1024',
      response_format: request.response_format ?? 'b64_json',
    };

    // Add reference images if provided (for image-to-image generation with qwen-image model)
    if (request.imageDataUrls && request.imageDataUrls.length > 0) {
      body.imageDataUrls = request.imageDataUrls;
    }

    try {
      const response = await fetch(NANOGPT_IMAGES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ImageGenerationError(
          `NanoGPT image generation failed: ${response.status} ${response.statusText} - ${errorText}`,
          this.id,
          response.status
        );
      }

      const data = await response.json();

      if (settings.uiSettings.debugMode) {
        console.log('[NanoGPT] Generation response:', {
          imageCount: data.data?.length ?? 0,
          cost: data.cost,
          remainingBalance: data.remainingBalance,
        });
      }

      return {
        images: (data.data || []).map((img: any) => ({
          b64_json: img.b64_json,
          url: img.url,
          revised_prompt: img.revised_prompt,
        })),
        model: request.model || FALLBACK_MODEL,
        cost: data.cost,
        remainingBalance: data.remainingBalance,
      };
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        throw error;
      }
      throw new ImageGenerationError(
        `NanoGPT request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.id,
        undefined,
        error
      );
    }
  }

  async listModels(): Promise<ImageModelInfo[]> {
    try {
      const response = await fetch(NANOGPT_MODELS_ENDPOINT);

      if (!response.ok) {
        console.warn('[NanoGPT] Failed to fetch models, using fallback');
        return this.getFallbackModels();
      }

      const data = await response.json();

      // NanoGPT returns models at data.models.images
      const imageModels = data?.models?.images || [];

      if (!Array.isArray(imageModels) || imageModels.length === 0) {
        console.warn('[NanoGPT] No image models found in response, using fallback');
        return this.getFallbackModels();
      }

      return imageModels.map((model: any) => ({
        id: model.id || model.model || model.name,
        name: model.name || model.id || model.model,
        description: model.description,
        supportsSizes: model.sizes || ['512x512', '1024x1024'],
        supportsImg2Img: model.supportsImg2Img ?? false,
        costPerImage: model.cost ?? model.costPerImage,
      }));
    } catch (error) {
      console.warn('[NanoGPT] Error fetching models:', error);
      return this.getFallbackModels();
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Try to list models - if API key is invalid, this should fail
      const response = await fetch(NANOGPT_IMAGES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: 'test',
          model: FALLBACK_MODEL,
          n: 0, // Request 0 images to just validate auth
        }),
      });

      // Even if it fails due to n=0, a 401 means invalid auth
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }

  private getFallbackModels(): ImageModelInfo[] {
    return [
      {
        id: 'z-image-turbo',
        name: 'Image Turbo',
        description: 'Fast, efficient image generation',
        supportsSizes: ['512x512', '1024x1024'],
        supportsImg2Img: false,
      },
      {
        id: 'hidream',
        name: 'HiDream',
        description: 'High quality image generation',
        supportsSizes: ['256x256', '512x512', '1024x1024'],
        supportsImg2Img: false,
      },
      {
        id: 'flux-kontext',
        name: 'Flux Kontext',
        description: 'Context-aware image generation',
        supportsSizes: ['512x512', '1024x1024'],
        supportsImg2Img: true,
      },
    ];
  }
}

/**
 * Create a NanoGPT image provider instance.
 * @param apiKey - The NanoGPT API key
 */
export function createNanoGPTProvider(apiKey: string): ImageProvider {
  return new NanoGPTImageProvider(apiKey);
}
