/**
 * Configuration Router
 * API endpoints for system configuration management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as configManager from "../configurationManager";
import type { SystemConfiguration } from "../configurationManager";
import { requirePermission } from "../_core/permissionMiddleware";

export const configurationRouter = router({
  /**
   * Get current configuration
   */
  get: protectedProcedure
    .use(requirePermission("settings:manage"))
    .query(() => {
      return configManager.getConfiguration();
    }),

  /**
   * Get a specific configuration value
   */
  getValue: protectedProcedure
    .use(requirePermission("settings:manage"))
    .input(z.object({ path: z.string() }))
    .query(({ input }) => {
      return configManager.getConfigValue(input.path);
    }),

  /**
   * Set a configuration value
   */
  setValue: protectedProcedure
    .use(requirePermission("settings:manage"))
    .input(
      z.object({
        path: z.string(),
        value: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.record(z.string(), z.unknown()),
        ]),
        reason: z.string().optional(),
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
  reset: protectedProcedure
    .use(requirePermission("settings:manage"))
    .mutation(({ ctx }) => {
      configManager.resetConfiguration(ctx.user.id);
      return { success: true };
    }),

  /**
   * Get configuration change history
   */
  getHistory: protectedProcedure
    .use(requirePermission("settings:manage"))
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => {
      return configManager.getConfigHistory(input.limit);
    }),

  /**
   * Validate configuration
   */
  validate: protectedProcedure
    .use(requirePermission("settings:manage"))
    .input(z.record(z.string(), z.unknown()))
    .query(({ input }) => {
      const errors = configManager.validateConfiguration(
        input as unknown as SystemConfiguration
      );
      return { valid: errors.length === 0, errors };
    }),

  /**
   * Apply a configuration preset
   */
  applyPreset: protectedProcedure
    .use(requirePermission("settings:manage"))
    .input(
      z.object({
        preset: z.enum(["retail", "wholesale", "manufacturing"]),
      })
    )
    .mutation(({ input, ctx }) => {
      configManager.applyConfigPreset(input.preset, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get feature flags
   */
  getFeatureFlags: protectedProcedure
    .use(requirePermission("settings:manage"))
    .query(() => {
      return {
        creditManagement:
          configManager.FeatureFlags.isCreditManagementEnabled(),
        badDebtWriteOff: configManager.FeatureFlags.isBadDebtWriteOffEnabled(),
        automaticGLPosting:
          configManager.FeatureFlags.isAutomaticGLPostingEnabled(),
        cogsCalculation: configManager.FeatureFlags.isCOGSCalculationEnabled(),
        inventoryTracking:
          configManager.FeatureFlags.isInventoryTrackingEnabled(),
      };
    }),
});
