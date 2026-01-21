<script lang="ts">
  import { settings } from "$lib/stores/settings.svelte";
  import { Play, Square, RefreshCw, Loader2 } from "lucide-svelte";
  import {
    GOOGLE_TRANSLATE_LANGUAGES,
    aiTTSService,
  } from "$lib/services/ai/tts";

  let isPlayingPreview = $state(false);
  let isLoadingPreview = $state(false);
  let previewError = $state<string | null>(null);

  // Play preview of selected voice
  async function playVoicePreview() {
    if (
      !settings.systemServicesSettings.tts.enabled ||
      isPlayingPreview ||
      isLoadingPreview
    )
      return;

    const tts = settings.systemServicesSettings.tts;

    // Validate based on provider
    if (tts.provider === "openai") {
      if (!tts.endpoint || !tts.apiKey) {
        previewError = "Endpoint and API key are required";
        return;
      }
    }

    isLoadingPreview = true;
    previewError = null;

    try {
      const previewText =
        "This is a preview of the selected voice. The story narration will sound like this.";

      // Initialize service with current settings
      await aiTTSService.initialize(tts);

      isPlayingPreview = true;
      isLoadingPreview = false;

      await aiTTSService.generateAndPlay(previewText, tts.voice, (progress) => {
        // We could use progress if we had a progress bar
      });

      isPlayingPreview = false;
    } catch (error) {
      console.error("[TTSSettings] Preview failed:", error);
      previewError = error instanceof Error ? error.message : "Preview failed";
      isPlayingPreview = false;
      isLoadingPreview = false;
    }
  }

  // Stop preview playback
  function stopPreview() {
    aiTTSService.stopPlayback();
    isPlayingPreview = false;
    isLoadingPreview = false;
  }

  // Reset TTS settings to defaults
  function resetSettings() {
    settings.resetTTSSettings();
    previewError = null;
  }
</script>

<div class="space-y-4">
  <!-- Enable TTS Toggle -->
  <div class="border-b border-surface-700 pb-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium text-surface-200">
          Text-to-Speech Narration
        </h3>
        <p class="text-xs text-surface-500">
          Generate audio narration of story events using TTS.
        </p>
      </div>
      <button
        class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
        class:bg-accent-600={settings.systemServicesSettings.tts.enabled}
        class:bg-surface-600={!settings.systemServicesSettings.tts.enabled}
        onclick={() => {
          settings.systemServicesSettings.tts.enabled =
            !settings.systemServicesSettings.tts.enabled;
          settings.saveSystemServicesSettings();
        }}
        aria-label="Toggle TTS"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          class:translate-x-6={settings.systemServicesSettings.tts.enabled}
          class:translate-x-1={!settings.systemServicesSettings.tts.enabled}
        ></span>
      </button>
    </div>
  </div>

  {#if settings.systemServicesSettings.tts.enabled}
    <!-- Provider Selection -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-surface-300"> TTS Provider </label>
      <p class="text-xs text-surface-500">
        Select the text-to-speech provider.
      </p>
      <select
        class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
        value={settings.systemServicesSettings.tts.provider}
        onchange={(e) => {
          settings.systemServicesSettings.tts.provider = e.currentTarget
            .value as "openai" | "google";
          // Set default voice for Google if current voice is not a valid Google language
          if (
            settings.systemServicesSettings.tts.provider === "google" &&
            !GOOGLE_TRANSLATE_LANGUAGES.some(
              (lang) => lang.id === settings.systemServicesSettings.tts.voice,
            )
          ) {
            settings.systemServicesSettings.tts.voice = "en";
          }
          settings.saveSystemServicesSettings();
        }}
      >
        <option value="openai"
          >OpenAI Compatible (OpenRouter, OpenAI, Local)</option
        >
        <option value="google">Google Translate</option>
      </select>
    </div>

    {#if settings.systemServicesSettings.tts.provider === "openai"}
      <!-- API Endpoint (Required for OpenAI) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300">
          API Endpoint
        </label>
        <p class="text-xs text-surface-500">
          TTS API endpoint (e.g., https://api.openai.com/v1/audio/speech)
        </p>
        <input
          type="text"
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.endpoint}
          oninput={(e) => {
            settings.systemServicesSettings.tts.endpoint =
              e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
          placeholder="https://api.openai.com/v1/audio/speech"
        />
      </div>

      <!-- API Key (Required for OpenAI) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300"> API Key </label>
        <p class="text-xs text-surface-500">
          Your API key for the TTS endpoint
        </p>
        <input
          type="password"
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.apiKey}
          oninput={(e) => {
            settings.systemServicesSettings.tts.apiKey = e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
          placeholder="Enter your API key"
        />
      </div>

      <!-- TTS Model (for OpenAI) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300"> TTS Model </label>
        <p class="text-xs text-surface-500">
          Model to use for speech generation.
        </p>
        <input
          type="text"
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.model}
          oninput={(e) => {
            settings.systemServicesSettings.tts.model = e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
          placeholder="tts-1"
        />
      </div>

      <!-- Voice (Text Input for OpenAI) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300"> Voice </label>
        <p class="text-xs text-surface-500">
          Voice ID for narration (e.g., alloy, nova, onyx)
        </p>
        <input
          type="text"
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.voice}
          oninput={(e) => {
            settings.systemServicesSettings.tts.voice = e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
          placeholder="alloy"
        />
      </div>
    {:else if settings.systemServicesSettings.tts.provider === "google"}
      <!-- Language Selection (for Google) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300"> Language </label>
        <p class="text-xs text-surface-500">
          Select the language for narration.
        </p>
        <select
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.voice}
          onchange={(e) => {
            settings.systemServicesSettings.tts.voice = e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
        >
          {#each GOOGLE_TRANSLATE_LANGUAGES as lang}
            <option value={lang.id}>{lang.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Voice Preview -->
    <div class="border-t border-surface-700 pt-4">
      <div class="flex gap-2">
        <button
          class="btn btn-primary btn-sm flex-1 gap-1 flex justify-center items-center"
          onclick={isPlayingPreview ? stopPreview : playVoicePreview}
          disabled={isLoadingPreview}
        >
          {#if isLoadingPreview}
            <Loader2 class="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          {:else if isPlayingPreview}
            <Square class="h-4 w-4" />
            <span>Stop</span>
          {:else}
            <Play class="h-4 w-4" />
            <span>Preview Voice</span>
          {/if}
        </button>
      </div>
      {#if previewError}
        <p class="text-xs text-error mt-2">{previewError}</p>
      {/if}
    </div>

    <!-- Speech Speed -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-surface-300">
        Speech Speed: <span class="text-accent-400"
          >{settings.systemServicesSettings.tts.speed.toFixed(2)}x</span
        >
      </label>
      <p class="text-xs text-surface-500">
        Adjust the speed of speech generation (0.25-4.0).
      </p>
      <input
        type="range"
        min="0.25"
        max="4"
        step="0.05"
        class="range range-xs range-accent w-full"
        value={settings.systemServicesSettings.tts.speed}
        oninput={(e) => {
          settings.systemServicesSettings.tts.speed = parseFloat(
            e.currentTarget.value,
          );
          settings.saveSystemServicesSettings();
        }}
      />
    </div>

    <!-- Auto-Play Toggle -->
    <div class="border-t border-surface-700 pt-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-surface-200">
            Auto-Play Narration
          </h3>
          <p class="text-xs text-surface-500">
            Automatically play TTS audio when story is narrated.
          </p>
        </div>
        <button
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
          class:bg-accent-600={settings.systemServicesSettings.tts.autoPlay}
          class:bg-surface-600={!settings.systemServicesSettings.tts.autoPlay}
          onclick={() => {
            settings.systemServicesSettings.tts.autoPlay =
              !settings.systemServicesSettings.tts.autoPlay;
            settings.saveSystemServicesSettings();
          }}
          aria-label="Toggle auto-play"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            class:translate-x-6={settings.systemServicesSettings.tts.autoPlay}
            class:translate-x-1={!settings.systemServicesSettings.tts.autoPlay}
          ></span>
        </button>
      </div>
    </div>

    <!-- Excluded Characters (Text Input) -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-surface-300">
        Excluded Characters
      </label>
      <p class="text-xs text-surface-500">
        Characters excluded from TTS narration (comma-separated)
      </p>
      <input
        type="text"
        class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
        value={settings.systemServicesSettings.tts.excludedCharacters}
        oninput={(e) => {
          settings.systemServicesSettings.tts.excludedCharacters =
            e.currentTarget.value;
          settings.saveSystemServicesSettings();
        }}
        placeholder="Comma-separated characters (e.g., *, #, _, ~)"
      />
    </div>

    <!-- HTML Tag Handling -->
    <div class="flex items-center justify-between space-y-2 mt-4">
      <div>
        <h3 class="text-sm font-medium text-surface-200">Remove HTML tags</h3>
        <p class="text-xs text-surface-500">
          Remove HTML tags from narrated text before sending to TTS. Always
          removes content of &lt;style&gt; tags as well.
        </p>
      </div>
      <button
        class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
        class:bg-accent-600={settings.systemServicesSettings.tts.removeHtmlTags}
        class:bg-surface-600={!settings.systemServicesSettings.tts
          .removeHtmlTags}
        onclick={() => {
          settings.systemServicesSettings.tts.removeHtmlTags =
            !settings.systemServicesSettings.tts.removeHtmlTags;
          settings.saveSystemServicesSettings();
        }}
        aria-label="Toggle HTML tag remove"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          class:translate-x-6={settings.systemServicesSettings.tts
            .removeHtmlTags}
          class:translate-x-1={!settings.systemServicesSettings.tts
            .removeHtmlTags}
        ></span>
      </button>
    </div>

    {#if settings.systemServicesSettings.tts.removeHtmlTags}
      <!-- HTML tags to remove content from (Text Input) -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-surface-300">
          HTML tags to remove content from
        </label>
        <p class="text-xs text-surface-500">
          Comma-separated list of HTML tags whose content should be removed
          before narration.
        </p>
        <input
          type="text"
          class="input input-sm w-full bg-surface-800 border-surface-600 text-surface-100"
          value={settings.systemServicesSettings.tts.htmlTagsToRemoveContent}
          oninput={(e) => {
            settings.systemServicesSettings.tts.htmlTagsToRemoveContent =
              e.currentTarget.value;
            settings.saveSystemServicesSettings();
          }}
          placeholder="Comma-separated HTML tags (e.g., div, span, font)"
          disabled={settings.systemServicesSettings.tts.removeAllHtmlContent}
          class:text-surface-600={settings.systemServicesSettings.tts
            .removeAllHtmlContent}
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-surface-200">
              Remove all tag content
            </h3>
            <p class="text-xs text-surface-500">
              Removes content inside any HTML tag before narration.
            </p>
          </div>
          <button
            class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
            class:bg-accent-600={settings.systemServicesSettings.tts
              .removeAllHtmlContent}
            class:bg-surface-600={!settings.systemServicesSettings.tts
              .removeAllHtmlContent}
            onclick={() => {
              settings.systemServicesSettings.tts.removeAllHtmlContent =
                !settings.systemServicesSettings.tts.removeAllHtmlContent;
              settings.saveSystemServicesSettings();
            }}
            aria-label="Toggle full HTML content removal"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              class:translate-x-6={settings.systemServicesSettings.tts
                .removeAllHtmlContent}
              class:translate-x-1={!settings.systemServicesSettings.tts
                .removeAllHtmlContent}
            ></span>
          </button>
        </div>
      </div>
    {/if}

    <!-- Reset Button -->
    <div class="border-t border-surface-700 pt-4 mt-4">
      <button
        class="btn btn-secondary text-xs flex items-center gap-1"
        onclick={resetSettings}
      >
        <RefreshCw class="h-3 w-3 mr-1" />
        Reset to Defaults
      </button>
    </div>
  {/if}
</div>
