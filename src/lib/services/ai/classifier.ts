import type { OpenAIProvider as OpenAIProvider } from './openrouter';
import type { Character, Location, Item, StoryBeat, StoryEntry, TimeTracker } from '$lib/types';
import { settings, type ClassifierSettings } from '$lib/stores/settings.svelte';
import { buildExtraBody } from './requestOverrides';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Classifier]', ...args);
  }
}

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

export class ClassifierService {
  private provider: OpenAIProvider;
  private settingsOverride?: Partial<ClassifierSettings>;

  constructor(provider: OpenAIProvider, settingsOverride?: Partial<ClassifierSettings>) {
    this.provider = provider;
    this.settingsOverride = settingsOverride;
  }

  private get model(): string {
    return this.settingsOverride?.model ?? settings.systemServicesSettings.classifier.model;
  }

  private get temperature(): number {
    return this.settingsOverride?.temperature ?? settings.systemServicesSettings.classifier.temperature;
  }

  private get maxTokens(): number {
    return this.settingsOverride?.maxTokens ?? settings.systemServicesSettings.classifier.maxTokens;
  }

  private get systemPrompt(): string {
    return this.settingsOverride?.systemPrompt ?? settings.systemServicesSettings.classifier.systemPrompt;
  }

  private get chatHistoryTruncation(): number {
    return this.settingsOverride?.chatHistoryTruncation ?? settings.systemServicesSettings.classifier.chatHistoryTruncation ?? 100;
  }

  async classify(context: ClassificationContext): Promise<ClassificationResult> {
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
    });

    const prompt = this.buildClassificationPrompt(context);

    try {
      log('Sending classification request...');

      const extraBody = buildExtraBody({
        manualMode: settings.advancedRequestSettings.manualMode,
        manualBody: this.settingsOverride?.manualBody ?? settings.systemServicesSettings.classifier.manualBody,
        reasoningEffort: this.settingsOverride?.reasoningEffort ?? settings.systemServicesSettings.classifier.reasoningEffort,
        providerOnly: this.settingsOverride?.providerOnly ?? settings.systemServicesSettings.classifier.providerOnly,
      });

      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody,
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
    // Include traits for characters so the classifier can decide when to prune
    const existingCharacterInfo = context.existingCharacters.map(c => {
      const traits = c.traits ?? [];
      if (traits.length === 0) return c.name;
      return `${c.name} [${traits.join(', ')}]`;
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

    return `Analyze this narrative passage and extract world state changes.

## Context
${context.genre ? `Genre: ${context.genre}` : ''}
Mode: ${isCreativeMode ? 'Creative Writing (author directing the story)' : 'Adventure (player as protagonist)'}
Already tracking: ${existingCharacterInfo.length} characters, ${existingLocationNames.length} locations, ${existingItemNames.length} items
${currentTimeInfo}
${chatHistoryBlock}
## ${inputLabel}
"${context.userAction}"

## The Narrative Response (to classify)
"""
${context.narrativeResponse}
"""

## Already Known Entities (check before adding duplicates)
Characters: ${existingCharacterInfo.length > 0 ? existingCharacterInfo.join(', ') : '(none)'}
Locations: ${existingLocationNames.length > 0 ? existingLocationNames.join(', ') : '(none)'}
Items: ${existingItemNames.length > 0 ? existingItemNames.join(', ') : '(none)'}

## Active Story Beats (update these when resolved!)
${existingBeatsList || '(none)'}

## Your Task
1. Check if any EXISTING entities need updates (status change, new info learned, etc.)
2. **IMPORTANT**: Check if any active story beats have been COMPLETED or FAILED in this passage - mark them accordingly to keep the list clean
3. Identify any NEW significant entities introduced (apply the extraction rules strictly)
4. Determine the current scene state

## Response Format (JSON only)
{
  "entryUpdates": {
    "characterUpdates": [],
    "locationUpdates": [],
    "itemUpdates": [],
    "storyBeatUpdates": [],
    "newCharacters": [],
    "newLocations": [],
    "newItems": [],
    "newStoryBeats": []
  },
  "scene": {
    "currentLocationName": null,
    "presentCharacterNames": [],
    "timeProgression": "none"
  }
}

### Field Specifications

characterUpdates: [{"name": "ExistingName", "changes": {"status": "active|inactive|deceased", "relationship": "new relationship", "newTraits": ["trait"], "removeTraits": ["trait"]}}]
- Traits should be concise phrases (6 words max)
- Use "removeTraits" when a character loses, overcomes, or no longer exhibits a trait (e.g., "cowardly" after an act of bravery, "injured" after healing)
- Also use "removeTraits" to prune redundant, outdated, or less important traits when a character has accumulated too many (aim to keep around 6 traits per character; if a character has 8+ traits, proactively remove the least relevant ones)

locationUpdates: [{"name": "ExistingName", "changes": {"visited": true, "current": true, "descriptionAddition": "new detail learned"}}]

itemUpdates: [{"name": "ExistingName", "changes": {"quantity": 1, "equipped": true, "location": "${itemLocationOptions}"}}]

storyBeatUpdates: [{"title": "ExistingBeatTitle", "changes": {"status": "completed|failed", "description": "optional updated description"}}]
- Mark as "completed" when a quest is finished, goal achieved, mystery solved, or plot point resolved
- Mark as "failed" when a quest becomes impossible, opportunity is lost, or goal is abandoned
- Clean up old beats that are no longer relevant to the current story

newCharacters: [{"name": "ProperName", "description": "one sentence", "relationship": "friend|enemy|ally|neutral|unknown", "traits": ["trait1"]}]
- Keep traits concise (6 words max each) and limit to 2-4 key traits per new character

newLocations: [{"name": "ProperName", "description": "one sentence", "visited": true, "current": false}]

newItems: [{"name": "ItemName", "description": "one sentence", "quantity": 1, "location": "${isCreativeMode ? 'with_character' : 'inventory'}"}]

newStoryBeats: [{"title": "Short Title", "description": "what happened or was learned", "type": "${storyBeatTypes}", "status": "pending|active|completed"}]

scene.currentLocationName: ${sceneLocationDesc}
scene.presentCharacterNames: Names of characters physically present in the scene
scene.timeProgression: How much time passed - "none", "minutes", "hours", or "days"
- Look at the chat history timestamps to see when time was last advanced
- If multiple messages have passed without time advancing, consider whether this narrative should advance time
- Actions like traveling, sleeping, waiting, or scene transitions typically warrant time progression
- Quick dialogue exchanges or immediate actions within the same scene may be "none"
- IMPORTANT: If 3 or more messages have passed without any time advancement, you should advance time by at least "minutes" - even casual dialogue takes time in the story world

Return valid JSON only. Empty arrays are fine - don't invent entities that aren't clearly in the text.`;
  }

  private parseClassificationResponse(content: string): ClassificationResult {
    // Try to extract JSON from the response
    let jsonStr = content.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
      const parsed = JSON.parse(jsonStr);

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
    } catch (e) {
      log('Failed to parse classification JSON', e, 'Content:', jsonStr.substring(0, 200));
      return this.getEmptyResult();
    }
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
