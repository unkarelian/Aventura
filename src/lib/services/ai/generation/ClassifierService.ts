import { BaseAIService, type OpenAIProvider } from '../core/BaseAIService';
import type { Character, Location, Item, StoryBeat, StoryEntry, TimeTracker, GenerationPreset } from '$lib/types';
import { promptService, type PromptContext } from '$lib/services/prompts';
import { tryParseJsonWithHealing } from '../utils/jsonHealing';
import {getJsonSupportLevel} from '../jsonSupport';
import {buildResponseFormat, maybeInjectJsonInstructions} from '../jsonInstructions';
import { createLogger } from '../core/config';

const log = createLogger('Classifier');

// Classification result types based on design document section 3.3.1
export interface ClassificationResult {
  // Entry updates
  entryUpdates: {
    // Updates to existing entries
    characterUpdates: CharacterUpdate[];
    locationUpdates: LocationUpdate[];
    itemUpdates: ItemUpdate[];
    storyBeatUpdates: StoryBeatUpdate[];

    // New entries discovered in the narrative
    newCharacters: NewCharacter[];
    newLocations: NewLocation[];
    newItems: NewItem[];
    newStoryBeats: NewStoryBeat[];
  };

  // Scene state
  scene: {
    currentLocationName: string | null;
    presentCharacterNames: string[];
    timeProgression: 'none' | 'minutes' | 'hours' | 'days';
  };
}

export interface CharacterUpdate {
  name: string;
  changes: {
    status?: 'active' | 'inactive' | 'deceased';
    relationship?: string;
    newTraits?: string[];
    removeTraits?: string[];
    // Visual descriptors for image generation
    addVisualDescriptors?: string[];
    removeVisualDescriptors?: string[];
    // Complete replacement of visual descriptors (preferred over add/remove)
    replaceVisualDescriptors?: string[];
  };
}

export interface LocationUpdate {
  name: string;
  changes: {
    visited?: boolean;
    current?: boolean;
    descriptionAddition?: string;
  };
}

export interface ItemUpdate {
  name: string;
  changes: {
    quantity?: number;
    equipped?: boolean;
    location?: string; // 'inventory', 'dropped', 'given', etc.
  };
}

export interface NewCharacter {
  name: string;
  description: string;
  relationship: string | null;
  traits: string[];
  // Visual appearance descriptors for image generation (hair, clothing, features)
  visualDescriptors: string[];
}

export interface NewLocation {
  name: string;
  description: string;
  visited: boolean;
  current: boolean;
}

export interface NewItem {
  name: string;
  description: string;
  quantity: number;
  location: string;
}

export interface NewStoryBeat {
  title: string;
  description: string;
  type: 'milestone' | 'quest' | 'revelation' | 'event' | 'plot_point';
  status: 'pending' | 'active' | 'completed';
}

export interface StoryBeatUpdate {
  title: string;
  changes: {
    status?: 'pending' | 'active' | 'completed' | 'failed';
    description?: string;
  };
}

// Chat history entry with time metadata for classification
export interface ClassificationChatEntry {
  role: 'user' | 'assistant';
  content: string;
  timeStart?: TimeTracker | null;
  timeEnd?: TimeTracker | null;
}

// Context for classification
export interface ClassificationContext {
  narrativeResponse: string;
  userAction: string;
  existingCharacters: Character[];
  existingLocations: Location[];
  existingItems: Item[];
  existingStoryBeats: StoryBeat[];
  genre: string | null;
  storyMode: 'adventure' | 'creative-writing';
  // Chat history with time metadata for context-aware classification
  chatHistory?: ClassificationChatEntry[];
  // Current story time for reference
  currentStoryTime?: TimeTracker | null;
}

export class ClassifierService extends BaseAIService {
  private chatHistoryTruncation: number;

  constructor(
    provider: OpenAIProvider,
    presetId: string = 'classification',
    chatHistoryTruncation: number = 100,
    settingsOverride?: Partial<GenerationPreset>
  ) {
    super(provider, presetId, settingsOverride);
    this.chatHistoryTruncation = chatHistoryTruncation;
  }
  async classify(context: ClassificationContext): Promise<ClassificationResult> {
    const jsonSupportLevel = getJsonSupportLevel(this.presetId);

    log('classify called', {
      model: this.model,
      temperature: this.temperature,
      reasoning: true,
      responseLength: context.narrativeResponse.length,
      existingCharacters: context.existingCharacters.length,
      existingLocations: context.existingLocations.length,
      existingItems: context.existingItems.length,
      chatHistoryEntries: context.chatHistory?.length ?? 0,
      currentStoryTime: context.currentStoryTime,
      jsonSupport: jsonSupportLevel,
    });

    const prompt = this.buildClassificationPrompt(context);
    const promptContext = this.buildPromptContext(context);
    const systemPrompt = promptService.renderPrompt('classifier', promptContext);

    const responseFormat = buildResponseFormat('classifier', jsonSupportLevel);
    const finalPrompt = maybeInjectJsonInstructions(prompt, 'classifier', jsonSupportLevel);

    try {
      log('Sending classification request...');

      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalPrompt }
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
        responseFormat,
      });

      log('Classification response received', {
        contentLength: response.content.length,
        usage: response.usage
      });

      const result = this.parseClassificationResponse(response.content);
      log('Classification parsed successfully', {
        newCharacters: result.entryUpdates.newCharacters.length,
        newLocations: result.entryUpdates.newLocations.length,
        newItems: result.entryUpdates.newItems.length,
        newStoryBeats: result.entryUpdates.newStoryBeats.length,
        characterUpdates: result.entryUpdates.characterUpdates.length,
        locationUpdates: result.entryUpdates.locationUpdates.length,
        itemUpdates: result.entryUpdates.itemUpdates.length,
        currentLocation: result.scene.currentLocationName,
        presentCharacters: result.scene.presentCharacterNames,
      });

      return result;
    } catch (error) {
      log('Classification failed', error);
      // Return empty result on failure - don't break the main flow
      return this.getEmptyResult();
    }
  }

  private formatTime(time: TimeTracker | null | undefined): string {
    if (!time) return 'unknown';
    const parts: string[] = [];
    if (time.years > 0) parts.push(`Year ${time.years}`);
    if (time.days > 0) parts.push(`Day ${time.days}`);
    if (time.hours > 0 || time.minutes > 0) {
      const hour = time.hours.toString().padStart(2, '0');
      const minute = time.minutes.toString().padStart(2, '0');
      parts.push(`${hour}:${minute}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Day 0, 00:00';
  }

  private truncateToWords(text: string, maxWords: number): string {
    if (maxWords <= 0) return text; // 0 = no truncation
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  }

  private buildChatHistoryBlock(chatHistory: ClassificationChatEntry[] | undefined): string {
    if (!chatHistory || chatHistory.length === 0) return '';

    const truncationLimit = this.chatHistoryTruncation;

    const formattedEntries = chatHistory.map((entry, index) => {
      const roleLabel = entry.role === 'user' ? 'USER' : 'ASSISTANT';
      const timeInfo = entry.timeEnd ? ` [Story Time: ${this.formatTime(entry.timeEnd)}]` : '';
      // Truncate by words (0 = no truncation)
      const truncatedContent = this.truncateToWords(entry.content, truncationLimit);
      return `[${index + 1}] ${roleLabel}${timeInfo}:\n${truncatedContent}`;
    }).join('\n\n');

    return `
## Chat History (with story time)
The following is the visible chat history. Use this to understand context and track when time was last advanced.
Each ASSISTANT message shows the story time AFTER that message (timeEnd).

${formattedEntries}
`;
  }

  private buildClassificationPrompt(context: ClassificationContext): string {
    const promptContext = this.buildPromptContext(context);

    // Include traits and visual descriptors for characters so the classifier can prune
    const existingCharacterInfo = context.existingCharacters.map(c => {
      const traits = c.traits ?? [];
      const visualDesc = c.visualDescriptors ?? [];
      const parts = [c.name];
      if (traits.length > 0) {
        parts.push(`Traits: ${traits.join(', ')}`);
      }
      if (visualDesc.length > 0) {
        parts.push(`Appearance: ${visualDesc.join(', ')}`);
      }
      return parts.join(' | ');
    });
    const existingLocationNames = context.existingLocations.map(l => l.name);
    const existingItemNames = context.existingItems.map(i => i.name);
    const isCreativeMode = context.storyMode === 'creative-writing';

    // Format existing story beats with their status
    const existingBeatsList = context.existingStoryBeats
      .filter(b => b.status === 'pending' || b.status === 'active')
      .map(b => `• "${b.title}" [${b.status}]: ${b.description || '(no description)'}`)
      .join('\n');

    // Mode-specific terminology
    const inputLabel = isCreativeMode ? "The Author's Direction" : "The Player's Action";
    const sceneLocationDesc = isCreativeMode
      ? "The name of where the current scene takes place, or null if unchanged"
      : "The name of where the protagonist IS (not where they're going), or null if unchanged";
    const itemLocationOptions = isCreativeMode
      ? "with_character|scene|mentioned"
      : "inventory|dropped|given";
    const storyBeatTypes = isCreativeMode
      ? "plot_point|revelation|milestone|event"
      : "quest|revelation|milestone|event";

    // Build chat history block if available
    const chatHistoryBlock = this.buildChatHistoryBlock(context.chatHistory);

    // Build current time reference
    const currentTimeInfo = context.currentStoryTime
      ? `Current Story Time: ${this.formatTime(context.currentStoryTime)}`
      : '';

    return promptService.renderUserPrompt('classifier', promptContext, {
      genre: context.genre ? `Genre: ${context.genre}` : '',
      mode: context.storyMode,
      entityCounts: `${existingCharacterInfo.length} characters, ${existingLocationNames.length} locations, ${existingItemNames.length} items`,
      currentTimeInfo,
      chatHistoryBlock,
      inputLabel,
      userAction: context.userAction,
      narrativeResponse: context.narrativeResponse,
      existingCharacters: existingCharacterInfo.length > 0 ? '\n' + existingCharacterInfo.map(c => `• ${c}`).join('\n') : '(none)',
      existingLocations: existingLocationNames.length > 0 ? existingLocationNames.join(', ') : '(none)',
      existingItems: existingItemNames.length > 0 ? existingItemNames.join(', ') : '(none)',
      existingBeats: existingBeatsList || '(none)',
      itemLocationOptions,
      defaultItemLocation: isCreativeMode ? 'with_character' : 'inventory',
      storyBeatTypes,
      sceneLocationDesc,
    });
  }

  private buildPromptContext(context: ClassificationContext): PromptContext {
    const protagonist = context.existingCharacters.find(c => c.relationship === 'self');
    const protagonistName = protagonist?.name || 'the protagonist';
    const isCreative = context.storyMode === 'creative-writing';

    return {
      mode: context.storyMode,
      pov: isCreative ? 'third' : 'second',
      tense: isCreative ? 'past' : 'present',
      protagonistName,
    };
  }

  private parseClassificationResponse(content: string): ClassificationResult {
    const parsed = tryParseJsonWithHealing<Record<string, any>>(content);
    if (!parsed) {
      log('Failed to parse classification JSON, Content:', content.substring(0, 200));
      return this.getEmptyResult();
    }

    // Validate and normalize the structure
    return {
      entryUpdates: {
        characterUpdates: Array.isArray(parsed.entryUpdates?.characterUpdates)
          ? parsed.entryUpdates.characterUpdates : [],
        locationUpdates: Array.isArray(parsed.entryUpdates?.locationUpdates)
          ? parsed.entryUpdates.locationUpdates : [],
        itemUpdates: Array.isArray(parsed.entryUpdates?.itemUpdates)
          ? parsed.entryUpdates.itemUpdates : [],
        storyBeatUpdates: Array.isArray(parsed.entryUpdates?.storyBeatUpdates)
          ? parsed.entryUpdates.storyBeatUpdates : [],
        newCharacters: Array.isArray(parsed.entryUpdates?.newCharacters)
          ? parsed.entryUpdates.newCharacters : [],
        newLocations: Array.isArray(parsed.entryUpdates?.newLocations)
          ? parsed.entryUpdates.newLocations : [],
        newItems: Array.isArray(parsed.entryUpdates?.newItems)
          ? parsed.entryUpdates.newItems : [],
        newStoryBeats: Array.isArray(parsed.entryUpdates?.newStoryBeats)
          ? parsed.entryUpdates.newStoryBeats : [],
      },
      scene: {
        currentLocationName: parsed.scene?.currentLocationName ?? null,
        presentCharacterNames: Array.isArray(parsed.scene?.presentCharacterNames)
          ? parsed.scene.presentCharacterNames : [],
        timeProgression: parsed.scene?.timeProgression ?? 'none',
      },
    };
  }

  private getEmptyResult(): ClassificationResult {
    return {
      entryUpdates: {
        characterUpdates: [],
        locationUpdates: [],
        itemUpdates: [],
        storyBeatUpdates: [],
        newCharacters: [],
        newLocations: [],
        newItems: [],
        newStoryBeats: [],
      },
      scene: {
        currentLocationName: null,
        presentCharacterNames: [],
        timeProgression: 'none',
      },
    };
  }
}
