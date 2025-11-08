/**
 * Configuration Router
 * API endpoints for system configuration management
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import * as configManager from "../configurationManager";
import { requirePermission } from "../_core/permissionMiddleware";

export const configurationRouter = router({
  /**
   * Get current configuration
   */
  get: requirePermission("settings:manage").query(() => {
    return configManager.getConfiguration();
  }),

  /**
   * Get a specific configuration value
   */
  getValue: requirePermission("settings:manage")
    .input(z.object({ path: z.string() }))
    .query(({ input }) => {
      return configManager.getConfigValue(input.path);
    }),

  /**
   * Set a configuration value
   */
  setValue: requirePermission("settings:manage")
    .input(
      z.object({
        path: z.string(),
        value: z.any(),
        reason: z.string().optional()
      })
    )
    .mutation(({ input, ctx }) => {
      configManager.setConfigValue(
        input.path,
        input.value,
        ctx.user.id,
        input.reason
      );
      return { success: true };
    }),

  /**
   * Reset configuration to defaults
   */
  reset: requirePermission("settings:manage").mutation(({ ctx }) => {
    configManager.resetConfiguration(ctx.user.id);
    return { success: true };
  }),

  /**
   * Get configuration change history
   */
  getHistory: requirePermission("settings:manage")
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => {
      return configManager.getConfigHistory(input.limit);
    }),

  /**
   * Validate configuration
   */
  validate: requirePermission("settings:manage")
    .input(z.any())
    .query(({ input }) => {
      const errors = configManager.validateConfiguration(input);
      return { valid: errors.length === 0, errors };
    }),

  /**
   * Apply a configuration preset
   */
  applyPreset: requirePermission("settings:manage")
    .input(
      z.object({
        preset: z.enum(["retail", "wholesale", "manufacturing"])
      })
    )
    .mutation(({ input, ctx }) => {
      configManager.applyConfigPreset(input.preset, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get feature flags
   */
  getFeatureFlags: requirePermission("settings:manage").query(() => {
    return {
      creditManagement: configManager.FeatureFlags.isCreditManagementEnabled(),
      badDebtWriteOff: configManager.FeatureFlags.isBadDebtWriteOffEnabled(),
      automaticGLPosting: configManager.FeatureFlags.isAutomaticGLPostingEnabled(),
      cogsCalculation: configManager.FeatureFlags.isCOGSCalculationEnabled(),
      inventoryTracking: configManager.FeatureFlags.isInventoryTrackingEnabled()
    };
  })
});

