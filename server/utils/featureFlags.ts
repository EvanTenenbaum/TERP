/**
 * Feature Flags
 * 
 * Centralized feature flag management for safe, incremental feature rollout.
 * 
 * Usage:
 * - Set environment variables to enable/disable features
 * - Use `isFeatureEnabled()` to check if a feature is enabled
 * - Features are disabled by default for safety
 */

export const FEATURE_FLAGS = {
  /**
   * Live Catalog Feature
   * 
   * Enables the VIP Portal Live Catalog feature, allowing clients to browse
   * a personalized inventory catalog and submit interest lists.
   * 
   * Environment Variable: FEATURE_LIVE_CATALOG
   * Default: false (disabled)
   */
  LIVE_CATALOG: process.env.FEATURE_LIVE_CATALOG === 'true',
} as const;

/**
 * Check if a feature is enabled
 * 
 * @param flag - The feature flag to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get all feature flags and their current state
 * 
 * @returns Object containing all feature flags and their enabled/disabled state
 */
export function getAllFeatureFlags(): Record<keyof typeof FEATURE_FLAGS, boolean> {
  return { ...FEATURE_FLAGS };
}
