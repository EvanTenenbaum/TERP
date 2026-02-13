import { logger } from './_core/logger';

/**
 * Configuration Management

/**
 * Centralized system configuration with validation and history
 *
 * Features:
 * - Type-safe configuration access
 * - Configuration validation
 * - Change history
 * - Feature flags
 */

/**
 * System configuration schema
 * All configurable parameters with their types and defaults
 */
export interface SystemConfiguration {
  // Accounting
  accounting: {
    defaultFiscalYearStart: string; // MM-DD format
    allowNegativeInventory: boolean;
    requireGLApproval: boolean;
    autoPostGLEntries: boolean;
  };
  
  // Inventory
  inventory: {
    lowStockThreshold: number;
    enableBatchTracking: boolean;
    enableLotTracking: boolean;
    defaultCogsMode: "FIXED" | "RANGE";
  };
  
  // Credits
  credits: {
    defaultExpirationDays: number;
    allowExpiredCredits: boolean;
    maxCreditAmount: number;
    requireApprovalAbove: number;
  };
  
  // Transactions
  transactions: {
    allowPartialPayments: boolean;
    allowPartialRefunds: boolean;
    requireReasonForRefund: boolean;
    autoLinkPayments: boolean;
  };
  
  // Bad Debt
  badDebt: {
    autoWriteOffAfterDays: number;
    requireApproval: boolean;
    maxWriteOffAmount: number;
  };
  
  // Audit
  audit: {
    enableDetailedLogging: boolean;
    retentionDays: number;
    logIPAddress: boolean;
    logUserAgent: boolean;
  };
  
  // Feature Flags
  features: {
    enableCreditManagement: boolean;
    enableBadDebtWriteOff: boolean;
    enableAutomaticGLPosting: boolean;
    enableCOGSCalculation: boolean;
    enableInventoryTracking: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SystemConfiguration = {
  accounting: {
    defaultFiscalYearStart: "01-01",
    allowNegativeInventory: false,
    requireGLApproval: false,
    autoPostGLEntries: true
  },
  inventory: {
    lowStockThreshold: 10,
    enableBatchTracking: true,
    enableLotTracking: true,
    defaultCogsMode: "FIXED"
  },
  credits: {
    defaultExpirationDays: 365,
    allowExpiredCredits: false,
    maxCreditAmount: 100000,
    requireApprovalAbove: 10000
  },
  transactions: {
    allowPartialPayments: true,
    allowPartialRefunds: true,
    requireReasonForRefund: true,
    autoLinkPayments: true
  },
  badDebt: {
    autoWriteOffAfterDays: 0, // 0 = disabled
    requireApproval: true,
    maxWriteOffAmount: 50000
  },
  audit: {
    enableDetailedLogging: true,
    retentionDays: 2555, // 7 years
    logIPAddress: true,
    logUserAgent: true
  },
  features: {
    enableCreditManagement: true,
    enableBadDebtWriteOff: true,
    enableAutomaticGLPosting: true,
    enableCOGSCalculation: true,
    enableInventoryTracking: true
  }
};

/**
 * In-memory configuration cache
 * In production, this should be stored in a database table
 */
let currentConfig: SystemConfiguration = { ...DEFAULT_CONFIG };

/**
 * Configuration change history
 */
interface ConfigChange {
  timestamp: Date;
  userId: number;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}

const configHistory: ConfigChange[] = [];

/**
 * Get current configuration
 * @returns Current system configuration
 */
export function getConfiguration(): SystemConfiguration {
  return { ...currentConfig };
}

/**
 * Get a specific configuration value
 * @param path Configuration path (e.g., "accounting.autoPostGLEntries")
 * @returns Configuration value
 */
export function getConfigValue(path: string): unknown {
  const parts = path.split(".");
  let value: unknown = currentConfig;
  
  for (const part of parts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (value && typeof value === "object" && part in value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Set a configuration value
 * @param path Configuration path
 * @param value New value
 * @param userId User making the change
 * @param reason Reason for change
 */
export function setConfigValue(
  path: string,
  value: unknown,
  userId: number,
  reason?: string
): void {
  const oldValue = getConfigValue(path);
  
  // Navigate to the parent object
  const parts = path.split(".");
  const lastPart = parts.pop();
  
  if (!lastPart) {
    throw new Error("Invalid configuration path");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = currentConfig;
  for (const part of parts) {
    if (!(part in target)) {
      throw new Error(`Invalid configuration path: ${path}`);
    }
    target = target[part];
  }
  
  // Validate the value type matches the old value type
  if (oldValue !== undefined && typeof value !== typeof oldValue) {
    throw new Error(
      `Type mismatch: expected ${typeof oldValue}, got ${typeof value}`
    );
  }
  
  // Set the new value
  target[lastPart] = value;
  
  // Record the change
  configHistory.push({
    timestamp: new Date(),
    userId,
    path,
    oldValue,
    newValue: value,
    reason
  });
  
  logger.info(`Configuration changed: ${path} = ${value} (by user ${userId})`);
}

/**
 * Reset configuration to defaults
 * @param userId User performing reset
 */
export function resetConfiguration(userId: number): void {
  const oldConfig = { ...currentConfig };
  currentConfig = { ...DEFAULT_CONFIG };
  
  configHistory.push({
    timestamp: new Date(),
    userId,
    path: "*",
    oldValue: oldConfig,
    newValue: currentConfig,
    reason: "Reset to defaults"
  });
}

/**
 * Get configuration change history
 * @param limit Maximum number of changes to return
 * @returns Configuration change history
 */
export function getConfigHistory(limit: number = 100): ConfigChange[] {
  return configHistory.slice(-limit);
}

/**
 * Validate configuration
 * @param config Configuration to validate
 * @returns Validation errors (empty if valid)
 */
export function validateConfiguration(config: SystemConfiguration): string[] {
  const errors: string[] = [];
  
  // Accounting validation
  if (!config.accounting.defaultFiscalYearStart.match(/^\d{2}-\d{2}$/)) {
    errors.push("accounting.defaultFiscalYearStart must be in MM-DD format");
  }
  
  // Inventory validation
  if (config.inventory.lowStockThreshold < 0) {
    errors.push("inventory.lowStockThreshold must be non-negative");
  }
  
  // Credits validation
  if (config.credits.defaultExpirationDays < 0) {
    errors.push("credits.defaultExpirationDays must be non-negative");
  }
  
  if (config.credits.maxCreditAmount < 0) {
    errors.push("credits.maxCreditAmount must be non-negative");
  }
  
  if (config.credits.requireApprovalAbove < 0) {
    errors.push("credits.requireApprovalAbove must be non-negative");
  }
  
  if (config.credits.requireApprovalAbove > config.credits.maxCreditAmount) {
    errors.push("credits.requireApprovalAbove cannot exceed maxCreditAmount");
  }
  
  // Bad Debt validation
  if (config.badDebt.autoWriteOffAfterDays < 0) {
    errors.push("badDebt.autoWriteOffAfterDays must be non-negative");
  }
  
  if (config.badDebt.maxWriteOffAmount < 0) {
    errors.push("badDebt.maxWriteOffAmount must be non-negative");
  }
  
  // Audit validation
  if (config.audit.retentionDays < 1) {
    errors.push("audit.retentionDays must be at least 1");
  }
  
  return errors;
}

/**
 * Feature flag helpers
 * 
 * @deprecated These legacy feature flags are deprecated and will be removed in a future version.
 * Please migrate to the new database-driven feature flag system:
 * 
 * ```typescript
 * // Old (deprecated):
 * import { FeatureFlags } from "./configurationManager";
 * if (FeatureFlags.isCreditManagementEnabled()) { ... }
 * 
 * // New (recommended):
 * import { featureFlagService } from "./services/featureFlagService";
 * if (await featureFlagService.isEnabled("credit-management", { userOpenId })) { ... }
 * ```
 * 
 * Migration mapping:
 * - enableCreditManagement -> "credit-management"
 * - enableBadDebtWriteOff -> "bad-debt-write-off"
 * - enableAutomaticGLPosting -> "automatic-gl-posting"
 * - enableCOGSCalculation -> "cogs-calculation"
 * - enableInventoryTracking -> "inventory-tracking"
 * 
 * The new system provides:
 * - Database-driven configuration (no code changes needed)
 * - Role-based overrides (different features for different roles)
 * - User-specific overrides (beta testing, gradual rollout)
 * - Audit logging (who changed what, when)
 * - Dependency management (feature A requires feature B)
 */
export const FeatureFlags = {
  /** @deprecated Use featureFlagService.isEnabled("credit-management") instead */
  isCreditManagementEnabled: (): boolean => 
    currentConfig.features.enableCreditManagement,
  
  /** @deprecated Use featureFlagService.isEnabled("bad-debt-write-off") instead */
  isBadDebtWriteOffEnabled: (): boolean => 
    currentConfig.features.enableBadDebtWriteOff,
  
  /** @deprecated Use featureFlagService.isEnabled("automatic-gl-posting") instead */
  isAutomaticGLPostingEnabled: (): boolean => 
    currentConfig.features.enableAutomaticGLPosting,
  
  /** @deprecated Use featureFlagService.isEnabled("cogs-calculation") instead */
  isCOGSCalculationEnabled: (): boolean => 
    currentConfig.features.enableCOGSCalculation,
  
  /** @deprecated Use featureFlagService.isEnabled("inventory-tracking") instead */
  isInventoryTrackingEnabled: (): boolean => 
    currentConfig.features.enableInventoryTracking,
};

/**
 * Configuration presets for different business types
 */
export const ConfigPresets = {
  retail: {
    ...DEFAULT_CONFIG,
    inventory: {
      ...DEFAULT_CONFIG.inventory,
      lowStockThreshold: 20,
      defaultCogsMode: "FIXED" as const
    },
    transactions: {
      ...DEFAULT_CONFIG.transactions,
      allowPartialPayments: true,
      allowPartialRefunds: true
    }
  },
  
  wholesale: {
    ...DEFAULT_CONFIG,
    inventory: {
      ...DEFAULT_CONFIG.inventory,
      lowStockThreshold: 100,
      defaultCogsMode: "RANGE" as const
    },
    credits: {
      ...DEFAULT_CONFIG.credits,
      defaultExpirationDays: 180,
      maxCreditAmount: 500000
    }
  },
  
  manufacturing: {
    ...DEFAULT_CONFIG,
    inventory: {
      ...DEFAULT_CONFIG.inventory,
      enableBatchTracking: true,
      enableLotTracking: true,
      defaultCogsMode: "RANGE" as const
    },
    accounting: {
      ...DEFAULT_CONFIG.accounting,
      requireGLApproval: true,
      autoPostGLEntries: false
    }
  }
};

/**
 * Apply a configuration preset
 * @param preset Preset name
 * @param userId User applying preset
 */
export function applyConfigPreset(
  preset: keyof typeof ConfigPresets,
  userId: number
): void {
  const oldConfig = { ...currentConfig };
  currentConfig = { ...ConfigPresets[preset] };
  
  configHistory.push({
    timestamp: new Date(),
    userId,
    path: "*",
    oldValue: oldConfig,
    newValue: currentConfig,
    reason: `Applied ${preset} preset`
  });
}

