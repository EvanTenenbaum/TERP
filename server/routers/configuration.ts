/**
 * Configuration Router
 * API endpoints for system configuration management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as configManager from "../configurationManager";

export const configurationRouter = router({
  /**
   * Get current configuration
   */
  get: protectedProcedure.query(() => {
    return configManager.getConfiguration();
  }),

  /**
   * Get a specific configuration value
   */
  getValue: protectedProcedure
    .input(z.object({ path: z.string() }))
    .query(({ input }) => {
      return configManager.getConfigValue(input.path);
    }),

  /**
   * Set a configuration value
   */
  setValue: protectedProcedure
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
  reset: protectedProcedure.mutation(({ ctx }) => {
    configManager.resetConfiguration(ctx.user.id);
    return { success: true };
  }),

  /**
   * Get configuration change history
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => {
      return configManager.getConfigHistory(input.limit);
    }),

  /**
   * Validate configuration
   */
  validate: protectedProcedure
    .input(z.any())
    .query(({ input }) => {
      const errors = configManager.validateConfiguration(input);
      return { valid: errors.length === 0, errors };
    }),

  /**
   * Apply a configuration preset
   */
  applyPreset: protectedProcedure
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
  getFeatureFlags: protectedProcedure.query(() => {
    return {
      creditManagement: configManager.FeatureFlags.isCreditManagementEnabled(),
      badDebtWriteOff: configManager.FeatureFlags.isBadDebtWriteOffEnabled(),
      automaticGLPosting: configManager.FeatureFlags.isAutomaticGLPostingEnabled(),
      cogsCalculation: configManager.FeatureFlags.isCOGSCalculationEnabled(),
      inventoryTracking: configManager.FeatureFlags.isInventoryTrackingEnabled()
    };
  })
});

