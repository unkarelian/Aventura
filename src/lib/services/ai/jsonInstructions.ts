/**
 * JSON Instruction Extraction & Injection Utility
 *
 * This module handles JSON response format configuration for prompts that demand JSON responses.
 *
 * Approach:
 * - JSON instructions are extracted from default prompts and stored in JSON_INSTRUCTIONS_MAP
 * - At runtime, instructions are conditionally injected based on the jsonSupport setting:
 *   - jsonSupport === 'none': Inject JSON instructions into prompts
 *   - jsonSupport === 'json_object' or 'json_schema': Use response_format parameter (no injection)
 *
 * Benefits:
 * - No fragile regex parsing of prompts
 * - Clear separation of concerns (core prompt vs JSON instructions)
 * - User's customizations are never modified
 */

import type { ResponseFormat, JSONSchema } from './types';
import type { JSONSupportLevel } from '$lib/types';
import { getSchemaForTemplate } from './jsonSchemas';

// ============================================================================
// JSON Instructions Map (Extracted from Default Prompts)
// ============================================================================

/**
 * JSON instructions extracted from default prompt templates.
 * These are stored separately and injected conditionally at runtime.
 *
 * Keys are template IDs, values are the JSON instruction text that would
 * appear at the end of the prompt.
 */
const JSON_INSTRUCTIONS_MAP: Record<string, string> = {
  // Classifier
  'classifier': `## Response Format (JSON only)
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

characterUpdates: [{"name": "ExistingName", "changes": {"status": "active|inactive|deceased", "relationship": "new relationship", "newTraits": ["trait"], "removeTraits": ["trait"], "replaceVisualDescriptors": ["Face: ...", "Hair: ...", "Eyes: ...", "Build: ...", "Clothing: ...", "Accessories: ...", "Distinguishing marks: ..."]}}]
NOTE: Use replaceVisualDescriptors (preferred) to output the COMPLETE cleaned-up appearance list. This replaces all existing descriptors.

locationUpdates: [{"name": "ExistingName", "changes": {"visited": true, "current": true, "descriptionAddition": "new detail learned"}}]

itemUpdates: [{"name": "ExistingName", "changes": {"quantity": 1, "equipped": true, "location": "{{itemLocationOptions}}"}}]

storyBeatUpdates: [{"title": "ExistingBeatTitle", "changes": {"status": "completed|failed", "description": "optional updated description"}}]

newCharacters: [{"name": "ProperName", "description": "one sentence", "relationship": "friend|enemy|ally|neutral|unknown", "traits": ["trait1"], "visualDescriptors": ["MUST include: face/skin, hair, eyes, build, full clothing, accessories - invent plausible details if not described"]}]

newLocations: [{"name": "ProperName", "description": "one sentence", "visited": true, "current": false}]

newItems: [{"name": "ItemName", "description": "one sentence", "quantity": 1, "location": "{{defaultItemLocation}}"}]

newStoryBeats: [{"title": "Short Title", "description": "what happened or was learned", "type": "{{storyBeatTypes}}", "status": "pending|active|completed"}]

scene.currentLocationName: {{sceneLocationDesc}}
scene.presentCharacterNames: Names of characters physically present in the scene
scene.timeProgression: Time elapsed based on activities - "none" (instant actions/brief dialogue), "minutes" (conversations/searches/short walks), "hours" (travel/lengthy tasks), "days" (sleep/long journeys/time skips). When in doubt, increment.

Return valid JSON only. Empty arrays are fine - don't invent entities that aren't clearly in the text.`,

  // Chapter Analysis
  'chapter-analysis': `## Output Format
Return ONLY a JSON object with a single field:
{ "chapterEnd": <integer message ID> }

## Rules
- Select exactly ONE endpoint
- The endpoint must be within the provided message range
- Choose the point that creates the most complete, self-contained chapter
- Prefer later messages that still complete the arc (avoid cutting mid-beat)`,

  // Chapter Summarization
  'chapter-summarization': `## Output Format
Respond with JSON only.`,

  // Retrieval Decision
  'retrieval-decision': `Respond with JSON:
{
  "relevantChapterIds": ["id1", "id2"],
  "queries": [
    {"chapterId": "id1", "question": "What was X?"}
  ]
}`,

  // Suggestions
  'suggestions': `## Response Format (JSON only)
Respond with JSON only:
{
  "suggestions": [
    {"text": "Direction 1...", "type": "action|dialogue|revelation|twist"},
    {"text": "Direction 2...", "type": "action|dialogue|revelation|twist"},
    {"text": "Direction 3...", "type": "action|dialogue|revelation|twist"}
  ]
}`,

  // Style Reviewer
  'style-reviewer': `## Response Format (JSON only)
Return an array of style issues found:
[
  {
    "issue": "Description of the style issue",
    "suggestion": "Suggested alternative or correction",
    "severity": "low|medium|high"
  }
]`,

  // Timeline Fill
  'timeline-fill': `## Response Format (JSON only)
Return an array of timeline events:
[
  {
    "event": "What happened",
    "timeframe": "When it happened"
  }
]`,

  // Timeline Fill Answer
  'timeline-fill-answer': `## Response Format (JSON only)
Return a JSON object:
{
  "answer": "The answer to the question",
  "confidence": "low|medium|high"
}`,

  // Setting Expansion (Wizard)
  'setting-expansion': `## Response Format (JSON only)
Return a JSON object:
{
  "name": "Setting name",
  "description": "Setting description",
  "locations": [
    {"name": "Location name", "description": "Location description"}
  ],
  "factions": [
    {"name": "Faction name", "description": "Faction description"}
  ]
}`,

  // Setting Refinement (Wizard)
  'setting-refinement': `## Response Format (JSON only)
Return a JSON object:
{
  "refinedDescription": "Refined setting description",
  "keyLocations": [
    {"name": "Location name", "description": "Location description"}
  ]
}`,

  // Protagonist Generation (Wizard)
  'protagonist-generation': `## Response Format (JSON only)
Return a JSON object:
{
  "name": "Character name",
  "description": "Character description",
  "motivation": "Character's primary motivation or goal"
}`,

  // Protagonist Elaboration (Wizard)
  'protagonist-elaboration': `## Response Format (JSON only)
Return a JSON object:
{
  "backstory": "Character's backstory",
  "personality": "Character's personality traits",
  "appearance": "Character's physical appearance"
}`,

  // Supporting Cast Generation (Wizard)
  'supporting-cast-generation': `## Response Format (JSON only)
Return an array of supporting characters:
[
  {
    "name": "Character name",
    "role": "Character's role in the story",
    "description": "Character description"
  }
]`,

  // Opening Generation (Wizard)
  'opening-generation': `## Response Format (JSON only)
Return a JSON object:
{
  "openingScene": "The opening scene description",
  "hook": "A compelling hook that draws the reader in",
  "initialConflict": "The initial conflict or challenge"
}`,

  // Vault Character Import
  'vault-character-import': `## Response Format (JSON only)
Return a JSON object:
{
  "name": "Character name",
  "description": "Character description",
  "personality": ["trait1", "trait2"],
  "appearance": ["visual descriptor 1", "visual descriptor 2"],
  "backstory": "Character backstory"
}`,

  // Vault Scenario Import
  'vault-scenario-import': `## Response Format (JSON only)
Return a JSON object:
{
  "title": "Scenario title",
  "description": "Scenario description",
  "genre": "Story genre",
  "setting": {
    "name": "Setting name",
    "description": "Setting description"
  },
  "characters": [
    {
      "name": "Character name",
      "role": "Character role",
      "description": "Character description"
    }
  ]
}`,

  // Tier3 Entry Selection
  'tier3-entry-selection': `## Response Format (JSON only)
Return ONLY a JSON array of numbers representing relevant entries.
Example: [1, 3, 7]

If no entries are relevant, return: []`,
};

/**
 * Check if a template has JSON instructions defined
 */
export function hasJsonInstructions(templateId: string): boolean {
  return templateId in JSON_INSTRUCTIONS_MAP;
}

/**
 * Get JSON instructions for a template
 * Returns empty string if no instructions are defined
 */
export function getJsonInstructions(templateId: string): string {
  return JSON_INSTRUCTIONS_MAP[templateId] ?? '';
}

// ============================================================================
// Response Format Builder
// ============================================================================

/**
 * Build the response_format parameter for structured output
 *
 * @param templateId - The template ID being used
 * @param jsonSupport - The user-configured JSON support level
 * @returns ResponseFormat object or undefined (if jsonSupport is 'none')
 */
export function buildResponseFormat(
  templateId: string,
  jsonSupport: JSONSupportLevel
): ResponseFormat | undefined {
  if (jsonSupport === 'json_object') {
    return { type: 'json_object' };
  }

  // Build response_format based on user's configured level
  if (jsonSupport === 'json_schema') {
    // Get schema for this prompt
    const schema = getSchemaForTemplate(templateId);
    if (!schema) {
      console.warn(`[jsonInstructions] No schema defined for template: ${templateId}`);
      return undefined;
    }

    return {
      type: 'json_schema',
      json_schema: {
        name: `${templateId}_response`,
        description: `Valid JSON response for ${templateId}`,
        strict: true,
        schema,
      },
    };
  }

  return undefined;
}

// ============================================================================
// JSON Instruction Injection
// ============================================================================

/**
 * Conditionally inject JSON instructions into a prompt
 *
 * When jsonSupport is 'none' or 'json_object', instructions are injected at the end of the prompt.
 * When jsonSupport is 'json_schema', no injection is done
 * (the full schema is sent via response_format parameter instead).
 *
 * Note: For 'json_object', we still inject instructions because only { type: 'json_object' } is sent
 * in the response_format parameter, without the schema structure.
 *
 * @param prompt - The rendered prompt without JSON instructions
 * @param templateId - The template ID being used
 * @param jsonSupport - The user-configured JSON support level
 * @returns Prompt with instructions injected (if applicable)
 */
export function maybeInjectJsonInstructions(
  prompt: string,
  templateId: string,
  jsonSupport: JSONSupportLevel
): string {
  // Only skip injection when using json_schema (full schema is sent via response_format)
  if (jsonSupport === 'json_schema') {
    return prompt;
  }

  // For 'none' and 'json_object', inject JSON instructions into the prompt
  const instructions = getJsonInstructions(templateId);
  if (!instructions) {
    return prompt;
  }

  // Append instructions to the end of the prompt
  return `${prompt}\n\n${instructions}`;
}

/**
 * Check if response_format should be used based on jsonSupport level
 */
export function shouldUseResponseFormat(jsonSupport: JSONSupportLevel): boolean {
  return jsonSupport === 'json_object' || jsonSupport === 'json_schema';
}
