/**
 * JSON Schema Definitions for Structured Output
 *
 * This module contains JSON Schema definitions for all prompts that demand JSON responses.
 * These schemas are used with OpenAI's response_format parameter to ensure structured output.
 *
 * Schemas are organized by template ID and match the expected structure from the prompt definitions.
 * Descriptions are extracted from the prompt definitions to improve response quality.
 */

import type { JSONSchema } from './types';

// ============================================================================
// Classifier Schema
// ============================================================================

export function getClassifierSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Extracts characters, locations, items, and story beats from narrative responses',
    properties: {
      entryUpdates: {
        type: 'object',
        description: 'Updates to existing entities and new entities to add',
        properties: {
          characterUpdates: {
            type: 'array',
            description: 'Updates to existing characters (status changes, new info, visual descriptor changes)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Exact name of the existing character to update'
                },
                changes: {
                  type: 'object',
                  description: 'Changes to apply to the character',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['active', 'inactive', 'deceased'],
                      description: 'Character status: active (present in story), inactive (not currently present), or deceased'
                    },
                    relationship: {
                      type: 'string',
                      description: 'Updated relationship to the protagonist'
                    },
                    newTraits: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'New personality traits or characteristics to add'
                    },
                    removeTraits: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Traits to remove from the character'
                    },
                    addVisualDescriptors: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Visual appearance details to add (face, hair, eyes, build, clothing, accessories, distinguishing marks)'
                    },
                    removeVisualDescriptors: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Visual descriptors to remove'
                    },
                    replaceVisualDescriptors: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'COMPLETE replacement list for visual descriptors (5-10 concise descriptors covering: face/skin, hair, eyes, build, full clothing, accessories, distinguishing marks)'
                    },
                  },
                },
              },
              required: ['name', 'changes'],
            },
          },
          locationUpdates: {
            type: 'array',
            description: 'Updates to existing locations (visited status, current location, new details)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Exact name of the existing location to update'
                },
                changes: {
                  type: 'object',
                  description: 'Changes to apply to the location',
                  properties: {
                    visited: {
                      type: 'boolean',
                      description: 'Whether the location has been visited in the story'
                    },
                    current: {
                      type: 'boolean',
                      description: 'Whether this is the current scene location'
                    },
                    descriptionAddition: {
                      type: 'string',
                      description: 'New details or information learned about the location'
                    },
                  },
                },
              },
              required: ['name', 'changes'],
            },
          },
          itemUpdates: {
            type: 'array',
            description: 'Updates to existing items (quantity, equipped status, location changes)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Exact name of the existing item to update'
                },
                changes: {
                  type: 'object',
                  description: 'Changes to apply to the item',
                  properties: {
                    quantity: {
                      type: 'number',
                      description: 'Updated quantity of the item'
                    },
                    equipped: {
                      type: 'boolean',
                      description: 'Whether the item is currently equipped'
                    },
                    location: {
                      type: 'string',
                      description: 'Where the item is located (inventory, room name, character name, etc.)'
                    },
                  },
                },
              },
              required: ['name', 'changes'],
            },
          },
          storyBeatUpdates: {
            type: 'array',
            description: 'Updates to existing story beats (mark completed/failed, update descriptions)',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Exact title of the existing story beat to update'
                },
                changes: {
                  type: 'object',
                  description: 'Changes to apply to the story beat',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pending', 'active', 'completed', 'failed'],
                      description: 'Story beat status: pending (not started), active (in progress), completed (finished), or failed (abandoned)'
                    },
                    description: {
                      type: 'string',
                      description: 'Updated description of the story beat'
                    },
                  },
                },
              },
              required: ['title', 'changes'],
            },
          },
          newCharacters: {
            type: 'array',
            description: 'New characters introduced in this passage (only extract named, plot-relevant characters)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Proper name of the new character'
                },
                description: {
                  type: 'string',
                  description: 'One sentence describing who they are and their role'
                },
                relationship: {
                  type: 'string',
                  enum: ['friend', 'enemy', 'ally', 'neutral', 'unknown'],
                  nullable: true,
                  description: 'Relationship to the protagonist (friend, enemy, ally, neutral, unknown)'
                },
                traits: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Personality traits or characteristics (e.g., "cunning", "brave", "mysterious")'
                },
                visualDescriptors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'COMPLETE visual appearance details for image generation (MUST include: face/skin tone, hair color/style, eyes, build/body type, full clothing outfit, accessories/jewelry/weapons, distinguishing marks like scars/tattoos). Invent plausible details if not explicitly described.'
                },
              },
              required: ['name', 'description', 'relationship', 'traits', 'visualDescriptors'],
            },
          },
          newLocations: {
            type: 'array',
            description: 'New locations introduced in this passage (only extract named locations where scenes take place)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Proper name of the new location'
                },
                description: {
                  type: 'string',
                  description: 'One sentence describing the location'
                },
                visited: {
                  type: 'boolean',
                  description: 'Whether the location has been visited in the story'
                },
                current: {
                  type: 'boolean',
                  description: 'Whether this is the current scene location'
                },
              },
              required: ['name', 'description', 'visited', 'current'],
            },
          },
          newItems: {
            type: 'array',
            description: 'New items acquired in this passage (only extract plot-significant items that characters explicitly acquire)',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the new item'
                },
                description: {
                  type: 'string',
                  description: 'One sentence describing the item'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity of the item (default: 1)'
                },
                location: {
                  type: 'string',
                  description: 'Where the item is located (inventory, room name, character name, etc.)'
                },
              },
              required: ['name', 'description', 'quantity', 'location'],
            },
          },
          newStoryBeats: {
            type: 'array',
            description: 'New story beats introduced in this passage (quests, tasks, revelations, plot points)',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Short title for the story beat'
                },
                description: {
                  type: 'string',
                  description: 'What happened or was learned (quest introduction, revelation, plot development)'
                },
                type: {
                  type: 'string',
                  enum: ['milestone', 'quest', 'revelation', 'event', 'plot_point'],
                  description: 'Type of story beat: milestone (major achievement), quest (task/objective), revelation (major discovery), event (occurrence), or plot_point (story development)'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'active', 'completed'],
                  description: 'Story beat status: pending (not started), active (in progress), or completed (finished)'
                },
              },
              required: ['title', 'description', 'type', 'status'],
            },
          },
        },
        required: [
          'characterUpdates',
          'locationUpdates',
          'itemUpdates',
          'storyBeatUpdates',
          'newCharacters',
          'newLocations',
          'newItems',
          'newStoryBeats',
        ],
      },
      scene: {
        type: 'object',
        description: 'Current scene state (location, present characters, time progression)',
        properties: {
          currentLocationName: {
            type: 'string',
            nullable: true,
            description: 'Name of the current scene location, or null if unclear'
          },
          presentCharacterNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of characters physically present in the current scene'
          },
          timeProgression: {
            type: 'string',
            enum: ['none', 'minutes', 'hours', 'days'],
            description: 'Time elapsed during this passage: none (instant actions/brief dialogue), minutes (conversations/searches/short walks), hours (travel/lengthy tasks), or days (sleep/long journeys/time skips)'
          },
        },
        required: ['currentLocationName', 'presentCharacterNames', 'timeProgression'],
      },
    },
    required: ['entryUpdates', 'scene'],
  };
}

// ============================================================================
// Chapter Analysis Schema
// ============================================================================

export function getChapterAnalysisSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Identifies the best endpoint for chapter summarization',
    properties: {
      chapterEnd: {
        type: 'integer',
        description: 'The message ID that represents the longest self-contained narrative arc within the given range. The endpoint should be at a natural narrative beat: resolution, decision, scene change, or clear transition.'
      },
    },
    required: ['chapterEnd'],
  };
}

// ============================================================================
// Chapter Summarization Schema
// ============================================================================

export function getChapterSummarizationSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Creates summaries of story chapters for the memory system',
    properties: {
      summary: {
        type: 'string',
        description: 'A concise 2-3 sentence summary of what happened in this chapter, including the most critical plot developments, key character turning points, major shifts in narrative direction/tone/setting, and essential conflicts introduced or resolved'
      },
      title: {
        type: 'string',
        description: 'A short evocative chapter title (3-6 words)'
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key words for searching and identifying this chapter'
      },
      characters: {
        type: 'array',
        items: { type: 'string' },
        description: 'Character names mentioned or appearing in this chapter'
      },
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Location names mentioned or visited in this chapter'
      },
      plotThreads: {
        type: 'array',
        items: { type: 'string' },
        description: 'Active plot threads or quests mentioned in this chapter'
      },
      emotionalTone: {
        type: 'string',
        description: 'The overall emotional tone of the chapter (e.g., tense, hopeful, mysterious, melancholic, triumphant)'
      },
    },
    required: ['summary', 'title', 'keywords', 'characters', 'locations', 'plotThreads', 'emotionalTone'],
  };
}

// ============================================================================
// Retrieval Decision Schema
// ============================================================================

export function getRetrievalDecisionSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Decides which past chapters are relevant for current context',
    properties: {
      relevantChapterIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Chapter IDs that are actually relevant to the current context (often empty - only include chapters that are truly relevant)'
      },
      queries: {
        type: 'array',
        description: 'Specific questions to ask about relevant chapters',
        items: {
          type: 'object',
          properties: {
            chapterId: {
              type: 'string',
              description: 'The chapter ID to query'
            },
            question: {
              type: 'string',
              description: 'A specific question about what happened in that chapter'
            },
          },
          required: ['chapterId', 'question'],
        },
      },
    },
    required: ['relevantChapterIds', 'queries'],
  };
}

// ============================================================================
// Suggestions Schema
// ============================================================================

export function getSuggestionsSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Generates story direction suggestions for creative writing mode',
    properties: {
      suggestions: {
        type: 'array',
        description: 'Three distinct story direction suggestions (plot developments, scene ideas, or narrative beats - NOT singular character actions)',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The suggestion text, formatted as an author\'s direction (e.g., "Continue the scene, having Marcus confront Elena about the missing documents, escalating into a heated argument")'
            },
            type: {
              type: 'string',
              enum: ['action', 'dialogue', 'revelation', 'twist'],
              description: 'The type of suggestion: action (plot development), dialogue (conversation focus), revelation (discovery), or twist (unexpected turn)'
            },
          },
          required: ['text', 'type'],
        },
      },
    },
    required: ['suggestions'],
  };
}

// ============================================================================
// Style Reviewer Schema
// ============================================================================

export function getStyleReviewerSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Identifies overused phrases and style issues in narrative text',
    properties: {
      issues: {
        type: 'array',
        description: 'List of identified style issues including phrase-level repetition, structural repetition, and other problems',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['phrase', 'structure', 'pattern', 'word_echo'],
              description: 'The type of issue: phrase (repeated descriptive phrases), structure (paragraphs that always start/end the same way), pattern (predictable structures), or word_echo (repeated words in close proximity)'
            },
            description: {
              type: 'string',
              description: 'Clear description of what the issue is (for structural issues, describe the pattern like "5 of 7 passages begin with ambient sound descriptions")'
            },
            examples: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific examples from the text showing the issue'
            },
            occurrences: {
              type: 'integer',
              description: 'Number of times this issue appears (2-3 = low severity, 4-5 = medium, 6+ = high)'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Severity level: low (2-3 occurrences, minor impact), medium (4-5 occurrences, noticeable), high (6+ occurrences, significantly impacts reading experience)'
            },
            suggestions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Alternative approaches or fixes for the issue'
            },
          },
          required: ['type', 'description', 'examples', 'occurrences', 'severity', 'suggestions'],
        },
      },
      overallQuality: {
        type: 'string',
        enum: ['good', 'needs_improvement', 'poor'],
        description: 'Overall assessment of prose quality: good (minimal issues), needs_improvement (some repetitive patterns), or poor (significant problems)'
      },
      summary: {
        type: 'string',
        description: 'Brief overall assessment of the passages'
      },
    },
    required: ['issues', 'overallQuality', 'summary'],
  };
}

// ============================================================================
// Timeline Fill Schema
// ============================================================================

export function getTimelineFillSchema(): JSONSchema {
  return {
    type: 'array',
    description: 'Generates queries to gather context from past chapters',
    items: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The question string to ask about the timeline'
        },
        chapters: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Array of chapter numbers to query (alternative to startChapter/endChapter)'
        },
        startChapter: {
          type: 'integer',
          description: 'Starting chapter number for an inclusive range (alternative to chapters array)'
        },
        endChapter: {
          type: 'integer',
          description: 'Ending chapter number for an inclusive range (alternative to chapters array)'
        },
      },
    },
  };
}

// ============================================================================
// Timeline Fill Answer Schema
// ============================================================================

export function getTimelineFillAnswerSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Answers specific questions about past chapter content',
    properties: {
      answer: {
        type: 'string',
        description: 'A concise, factual answer based only on the chapter content. If the information isn\'t available, say "Not mentioned in this chapter."'
      },
    },
    required: ['answer'],
  };
}

// ============================================================================
// Setting Expansion Schema (Wizard)
// ============================================================================

export function getSettingExpansionSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Expands a setting with locations and factions for the world generation wizard',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the setting/world'
      },
      description: {
        type: 'string',
        description: 'Full description of the setting, including atmosphere, themes, and overall feel'
      },
      locations: {
        type: 'array',
        description: 'Key locations within this setting',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the location'
            },
            description: {
              type: 'string',
              description: 'Brief description of the location'
            },
          },
          required: ['name', 'description'],
        },
      },
      factions: {
        type: 'array',
        description: 'Factions or organizations in this setting',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the faction'
            },
            description: {
              type: 'string',
              description: 'Brief description of the faction and its role in the world'
            },
          },
          required: ['name', 'description'],
        },
      },
    },
    required: ['name', 'description', 'locations', 'factions'],
  };
}

// ============================================================================
// Setting Refinement Schema (Wizard)
// ============================================================================

export function getSettingRefinementSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Refines a setting description and identifies key locations',
    properties: {
      refinedDescription: {
        type: 'string',
        description: 'Polished, evocative description of the setting that captures atmosphere, themes, and world details'
      },
      keyLocations: {
        type: 'array',
        description: 'Important locations within the setting',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the location'
            },
            description: {
              type: 'string',
              description: 'Brief description of the location and its significance'
            },
          },
          required: ['name', 'description'],
        },
      },
    },
    required: ['refinedDescription', 'keyLocations'],
  };
}

// ============================================================================
// Protagonist Generation Schema (Wizard)
// ============================================================================

export function getProtagonistGenerationSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Generates a protagonist character for the story',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the protagonist character'
      },
      description: {
        type: 'string',
        description: 'Brief description of who the protagonist is and what makes them interesting'
      },
      motivation: {
        type: 'string',
        description: 'What drives this character - their goals, desires, or purpose in the story'
      },
    },
    required: ['name', 'description', 'motivation'],
  };
}

// ============================================================================
// Protagonist Elaboration Schema (Wizard)
// ============================================================================

export function getProtagonistElaborationSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Elaborates on protagonist with backstory, personality, and appearance',
    properties: {
      backstory: {
        type: 'string',
        description: 'Character\'s history, where they come from, and important past events that shaped them'
      },
      personality: {
        type: 'string',
        description: 'Key personality traits, behavioral patterns, and character quirks'
      },
      appearance: {
        type: 'string',
        description: 'Physical appearance description suitable for image generation (face, hair, eyes, build, clothing, etc.)'
      },
    },
    required: ['backstory', 'personality', 'appearance'],
  };
}

// ============================================================================
// Supporting Cast Generation Schema (Wizard)
// ============================================================================

export function getSupportingCastGenerationSchema(): JSONSchema {
  return {
    type: 'array',
    description: 'Generates supporting cast characters for the story',
    items: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the supporting character'
        },
        role: {
          type: 'string',
          description: 'The character\'s role in the story (mentor, rival, guide, friend, antagonist, etc.)'
        },
        description: {
          type: 'string',
          description: 'Brief description of who they are and their relationship to the protagonist'
        },
      },
      required: ['name', 'role', 'description'],
    },
  };
}

// ============================================================================
// Opening Generation Schema (Wizard)
// ============================================================================

export function getOpeningGenerationSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Generates an opening scene for the story',
    properties: {
      openingScene: {
        type: 'string',
        description: 'The opening narrative scene that establishes the protagonist and setting'
      },
      hook: {
        type: 'string',
        description: 'The narrative hook that draws readers in and creates intrigue'
      },
      initialConflict: {
        type: 'string',
        description: 'The initial conflict or problem that propels the story forward'
      },
    },
    required: ['openingScene', 'hook', 'initialConflict'],
  };
}

// ============================================================================
// Vault Character Import Schema
// ============================================================================

export function getVaultCharacterImportSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Extracts and cleans character data from SillyTavern character cards for vault storage',
    properties: {
      name: {
        type: 'string',
        description: 'The character\'s actual name (what {{char}} refers to in the card)'
      },
      description: {
        type: 'string',
        description: '1-2 paragraphs describing who this character is - their role, personality, and key characteristics. Written as clean prose.'
      },
      background: {
        type: 'string',
        nullable: true,
        description: '1-2 paragraphs of backstory, history, and context. Set to null if card doesn\'t provide meaningful backstory.'
      },
      motivation: {
        type: 'string',
        nullable: true,
        description: 'What do they want? What drives their actions? 1-2 sentences. Set to null if not discernible from card.'
      },
      role: {
        type: 'string',
        nullable: true,
        description: 'A simple archetype or function: "Mentor", "Love Interest", "Antagonist", "Guide", "Companion", "Ruler", etc. Set to null if character doesn\'t fit a clear role.'
      },
      traits: {
        type: 'array',
        items: { type: 'string' },
        description: '3-8 personality traits as individual strings (e.g., "cunning", "brave", "mysterious")'
      },
      visualDescriptors: {
        type: 'array',
        items: { type: 'string' },
        description: '5-10 physical appearance details for image generation: face/skin tone, hair color/style, eyes, build/body type, full clothing outfit, accessories/jewelry/weapons, distinguishing marks like scars/tattoos'
      },
    },
    required: ['name', 'description', 'traits', 'visualDescriptors'],
  };
}

// ============================================================================
// Vault Scenario Import Schema
// ============================================================================

export function getVaultScenarioImportSchema(): JSONSchema {
  return {
    type: 'object',
    description: 'Extracts and cleans scenario data from SillyTavern character cards for vault storage',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the scenario/story'
      },
      description: {
        type: 'string',
        description: 'Full description of the scenario, including setting premise, themes, and overall story setup'
      },
      genre: {
        type: 'string',
        description: 'The genre of the scenario (Fantasy, Sci-Fi, Mystery, etc.)'
      },
      setting: {
        type: 'object',
        description: 'The setting/world where the scenario takes place',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the setting'
          },
          description: {
            type: 'string',
            description: 'Description of the setting'
          },
        },
        required: ['name', 'description'],
      },
      characters: {
        type: 'array',
        description: 'Key characters in the scenario',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Character name'
            },
            role: {
              type: 'string',
              description: 'Character role (Mentor, Rival, Guardian, Companion, etc.)'
            },
            description: {
              type: 'string',
              description: 'Brief description of the character'
            },
          },
          required: ['name', 'role', 'description'],
        },
      },
    },
    required: ['title', 'description', 'genre', 'setting', 'characters'],
  };
}

// ============================================================================
// Tier3 Entry Selection Schema
// ============================================================================

export function getTier3EntrySelectionSchema(): JSONSchema {
  return {
    type: 'array',
    description: 'Selects which lorebook entries are relevant for narrative context',
    items: {
      type: 'integer',
      description: 'Entry index number (as shown in the numbered list of entries)'
    },
  };
}

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Get JSON schema by template ID
 * Returns null if template doesn't have a schema defined
 */
export function getSchemaForTemplate(templateId: string): JSONSchema | null {
  const schemaMap: Record<string, () => JSONSchema> = {
    'classifier': getClassifierSchema,
    'chapter-analysis': getChapterAnalysisSchema,
    'chapter-summarization': getChapterSummarizationSchema,
    'retrieval-decision': getRetrievalDecisionSchema,
    'suggestions': getSuggestionsSchema,
    'style-reviewer': getStyleReviewerSchema,
    'timeline-fill': getTimelineFillSchema,
    'timeline-fill-answer': getTimelineFillAnswerSchema,
    'setting-expansion': getSettingExpansionSchema,
    'setting-refinement': getSettingRefinementSchema,
    'protagonist-generation': getProtagonistGenerationSchema,
    'protagonist-elaboration': getProtagonistElaborationSchema,
    'supporting-cast-generation': getSupportingCastGenerationSchema,
    'opening-generation': getOpeningGenerationSchema,
    'vault-character-import': getVaultCharacterImportSchema,
    'vault-scenario-import': getVaultScenarioImportSchema,
    'tier3-entry-selection': getTier3EntrySelectionSchema,
  };

  const schemaFn = schemaMap[templateId];
  return schemaFn ? schemaFn() : null;
}
