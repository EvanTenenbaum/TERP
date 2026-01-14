/**
 * Feature Flags (Legacy)
 * 
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please migrate to the new database-driven feature flag system.
 * 
 * Migration Guide:
 * ================
 * 
 * Old (deprecated):
 * ```typescript
 * import { isFeatureEnabled, FEATURE_FLAGS } from "./utils/featureFlags";
 * if (isFeatureEnabled("LIVE_CATALOG")) { ... }
 * ```
 * 
 * New (recommended):
 * ```typescript
 * import { featureFlagService } from "./services/featureFlagService";
 * if (await featureFlagService.isEnabled("live-catalog", { userOpenId })) { ... }
 * ```
 * 
 * Migration mapping:
 * - LIVE_CATALOG -> "live-catalog"
 * 
 * Benefits of the new system:
 * - Database-driven (no code changes or redeployment needed)
 * - Role-based overrides (different features for different roles)
 * - User-specific overrides (beta testing, gradual rollout)
 * - Audit logging (who changed what, when)
 * - Dependency management (feature A requires feature B)
 * - Admin UI for management
 */

import { logger } from "../_core/logger";

/**
 * @deprecated Use featureFlagService instead
 */
export const FEATURE_FLAGS = {
  /**
   * Live Catalog Feature
   *
   * @deprecated Use featureFlagService.isEnabled("live-catalog") instead
   *
   * Enables the VIP Portal Live Catalog feature, allowing clients to browse
   * a personalized inventory catalog and submit interest lists.
   *
   * Environment Variable: FEATURE_LIVE_CATALOG
   * Default: false (disabled)
   */
  LIVE_CATALOG: process.env.FEATURE_LIVE_CATALOG === 'true',

  /**
   * Email Integration
   *
   * Enables email sending functionality for receipts and notifications.
   * Requires external email service configuration (e.g., Resend, SendGrid).
   *
   * Environment Variable: FEATURE_EMAIL_ENABLED
   * Default: false (disabled)
   */
  EMAIL_ENABLED: process.env.FEATURE_EMAIL_ENABLED === 'true',

  /**
   * SMS Integration
   *
   * Enables SMS sending functionality for receipts and notifications.
   * Requires external SMS service configuration (e.g., Twilio).
   *
   * Environment Variable: FEATURE_SMS_ENABLED
   * Default: false (disabled)
   */
  SMS_ENABLED: process.env.FEATURE_SMS_ENABLED === 'true',
} as const;

// Track deprecation warnings to avoid spamming logs
const deprecationWarningsLogged = new Set<string>();

/**
 * Check if a feature is enabled
 * 
 * @deprecated Use featureFlagService.isEnabled() instead
 * 
 * @param flag - The feature flag to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  // Log deprecation warning once per flag
  if (!deprecationWarningsLogged.has(flag)) {
    deprecationWarningsLogged.add(flag);
    logger.warn({
      flag,
      newKey: flag.toLowerCase().replace(/_/g, "-"),
      msg: "[DEPRECATED] isFeatureEnabled() is deprecated. Use featureFlagService.isEnabled() instead.",
    });
  }
  
  return FEATURE_FLAGS[flag];
}

/**
 * Get all feature flags and their current state
 * 
 * @deprecated Use featureFlagService.getAllFlags() instead
 * 
 * @returns Object containing all feature flags and their enabled/disabled state
 */
export function getAllFeatureFlags(): Record<keyof typeof FEATURE_FLAGS, boolean> {
  // Log deprecation warning once
  if (!deprecationWarningsLogged.has("getAllFeatureFlags")) {
    deprecationWarningsLogged.add("getAllFeatureFlags");
    logger.warn({
      msg: "[DEPRECATED] getAllFeatureFlags() is deprecated. Use featureFlagService.getAllFlags() instead.",
    });
  }
  
  return { ...FEATURE_FLAGS };
}

/**
 * Mapping from legacy flag names to new database flag keys
 * Use this to help with migration
 */
export const LEGACY_TO_NEW_FLAG_MAPPING: Record<keyof typeof FEATURE_FLAGS, string> = {
  LIVE_CATALOG: "live-catalog",
  EMAIL_ENABLED: "email-enabled",
  SMS_ENABLED: "sms-enabled",
};
