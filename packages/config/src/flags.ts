/**
 * Feature Flags System
 * 
 * All flags default to false in production.
 * Use environment variables or database overrides for staged rollout.
 */

export type FeatureFlag = {
  key: string;
  description: string;
  defaultValue: boolean;
  scope: 'global' | 'user' | 'customer';
};

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Example flags - add new features here
  ENABLE_NEW_DASHBOARD: {
    key: 'ENABLE_NEW_DASHBOARD',
    description: 'Enable redesigned dashboard with enhanced analytics',
    defaultValue: false,
    scope: 'global',
  },
  ENABLE_ADVANCED_PRICING: {
    key: 'ENABLE_ADVANCED_PRICING',
    description: 'Enable advanced pricing rules and tier management',
    defaultValue: false,
    scope: 'customer',
  },
  ENABLE_MOBILE_UI: {
    key: 'ENABLE_MOBILE_UI',
    description: 'Enable mobile-optimized UI from Lovable frontend',
    defaultValue: false,
    scope: 'global',
  },
};

/**
 * Check if a feature flag is enabled
 * Priority: DB override > ENV var > default value
 */
export async function isFeatureEnabled(
  flagKey: string,
  context?: { userId?: string; customerId?: string }
): Promise<boolean> {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) {
    console.warn(`Unknown feature flag: ${flagKey}`);
    return false;
  }

  // Check environment variable override
  const envKey = `FEATURE_${flagKey}`;
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  // TODO: Check database override when FeatureFlag table is added
  // const dbOverride = await getFeatureFlagFromDB(flagKey, context);
  // if (dbOverride !== null) return dbOverride;

  // Return default
  return flag.defaultValue;
}

/**
 * Get all feature flags with their current state
 */
export function getAllFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS);
}
