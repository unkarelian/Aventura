import type { JSONSupportLevel } from '$lib/types';
import { settings } from '$lib/stores/settings.svelte';

/**
 * Service to determine JSON support level for a given preset.
 * Centralizes the logic of finding the preset and its associated API profile.
 */
export class JSONSupportService {
  /**
   * Determines the JSON support level for a given preset ID.
   * @param presetId The ID of the generation preset (e.g., 'classification', 'suggestions')
   * @returns The JSON support level: 'none', 'json_object', or 'json_schema'
   */
  static getSupportLevel(presetId: string): JSONSupportLevel {
    const preset = settings.generationPresets.find(p => p.id === presetId);
    if (!preset) return 'none';

    const profileId = preset.profileId ?? settings.apiSettings.mainNarrativeProfileId;
    const profile = settings.apiSettings.profiles.find(p => p.id === profileId);

    return profile?.jsonSupport ?? 'none';
  }
}

/**
 * Helper function for quick access to JSON support level.
 */
export function getJsonSupportLevel(presetId?: string): JSONSupportLevel {
  return presetId ? JSONSupportService.getSupportLevel(presetId) : 'none';
}
