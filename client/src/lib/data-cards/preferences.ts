/**
 * Data Card Preferences Manager
 * Handles localStorage-based user preferences for data card configurations
 */

import { MODULE_CONFIGS } from "./metricConfigs";

const STORAGE_KEY = 'terp_data_card_preferences';

export interface DataCardPreferences {
  [moduleId: string]: string[]; // Array of metric IDs
}

/**
 * Get user preferences from localStorage
 */
export function getPreferences(): DataCardPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const preferences = JSON.parse(stored) as DataCardPreferences;
    return preferences;
  } catch (error) {
    console.error('Failed to load data card preferences:', error);
    return {};
  }
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(preferences: DataCardPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save data card preferences:', error);
  }
}

/**
 * Get metric IDs for a specific module (user preference or defaults)
 */
export function getMetricIdsForModule(moduleId: string): string[] {
  const preferences = getPreferences();
  const userPreference = preferences[moduleId];
  
  if (userPreference && userPreference.length > 0) {
    return userPreference;
  }
  
  // Fall back to defaults
  const moduleConfig = MODULE_CONFIGS[moduleId];
  return moduleConfig?.defaultMetrics || [];
}

/**
 * Save metric IDs for a specific module
 */
export function saveMetricIdsForModule(moduleId: string, metricIds: string[]): void {
  const preferences = getPreferences();
  preferences[moduleId] = metricIds;
  savePreferences(preferences);
}

/**
 * Reset preferences for a specific module to defaults
 */
export function resetModulePreferences(moduleId: string): void {
  const preferences = getPreferences();
  delete preferences[moduleId];
  savePreferences(preferences);
}

/**
 * Reset all preferences to defaults
 */
export function resetAllPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset data card preferences:', error);
  }
}

/**
 * Check if user has customized preferences for a module
 */
export function hasCustomPreferences(moduleId: string): boolean {
  const preferences = getPreferences();
  return !!preferences[moduleId];
}
