/**
 * Feature Flag Middleware for tRPC
 *
 * Provides middleware functions to protect routes based on feature flags.
 * Use at the router level for module-wide protection, not per-endpoint.
 */

import { TRPCError } from "@trpc/server";
import { featureFlagService } from "../services/featureFlagService";
import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal context interface for feature flag middleware
 * The middleware only needs access to user info for flag evaluation
 */
interface FeatureFlagContext {
  user?: {
    id?: number;
    openId?: string;
  } | null;
}

/**
 * Middleware options passed to feature flag middleware functions
 */
interface MiddlewareOptions<
  TContext extends FeatureFlagContext = FeatureFlagContext,
> {
  ctx: TContext;
  next: () => Promise<unknown>;
}

/**
 * Type for middleware function that can be passed to whenFeatureEnabled
 */
type FeatureFlagMiddleware<
  TContext extends FeatureFlagContext = FeatureFlagContext,
> = (opts: MiddlewareOptions<TContext>) => Promise<unknown>;

/**
 * Middleware to require a module to be enabled
 *
 * Use this at the router level to protect entire modules.
 *
 * @param module - The module flag key (e.g., "module-accounting")
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { requireModule } from "../_core/featureFlagMiddleware";
 *
 * export const accountingRouter = router({
 *   // All procedures in this router require the accounting module
 * }).use(requireModule("module-accounting"));
 * ```
 */
export function requireModule(module: string) {
  return async ({ ctx, next }: MiddlewareOptions): Promise<unknown> => {
    // Only pass context if we have a valid userOpenId
    const context = ctx.user?.openId
      ? { userOpenId: ctx.user.openId }
      : undefined;
    const isEnabled = await featureFlagService.isModuleEnabled(module, context);

    if (!isEnabled) {
      logger.warn(
        {
          module,
          userId: ctx.user?.id,
          userOpenId: ctx.user?.openId,
        },
        "[FeatureFlags] Module access denied"
      );

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `The ${module.replace("module-", "")} module is not enabled for your account.`,
      });
    }

    return next();
  };
}

/**
 * Middleware to require a specific feature flag to be enabled
 *
 * Use this for individual features within a module.
 *
 * @param flagKey - The feature flag key
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { requireFeature } from "../_core/featureFlagMiddleware";
 *
 * export const creditRouter = router({
 *   applyCredit: protectedProcedure
 *     .use(requireFeature("credit-management"))
 *     .mutation(async ({ ctx, input }) => {
 *       // Only accessible if credit-management flag is enabled
 *     }),
 * });
 * ```
 */
export function requireFeature(flagKey: string) {
  return async ({ ctx, next }: MiddlewareOptions): Promise<unknown> => {
    // Only pass context if we have a valid userOpenId
    const context = ctx.user?.openId
      ? { userOpenId: ctx.user.openId }
      : undefined;
    const isEnabled = await featureFlagService.isEnabled(flagKey, context);

    if (!isEnabled) {
      logger.warn(
        {
          flagKey,
          userId: ctx.user?.id,
          userOpenId: ctx.user?.openId,
        },
        "[FeatureFlags] Feature access denied"
      );

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `The ${flagKey} feature is not enabled for your account.`,
      });
    }

    return next();
  };
}

/**
 * Create a conditional middleware that only applies if a flag is enabled
 *
 * Use this for optional behavior that should only run when a flag is on.
 * Unlike requireFeature, this doesn't block the request if the flag is off.
 *
 * @param flagKey - The feature flag key
 * @param middleware - The middleware to apply if flag is enabled
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { whenFeatureEnabled } from "../_core/featureFlagMiddleware";
 *
 * const auditMiddleware = whenFeatureEnabled("enhanced-audit", async ({ ctx, next }) => {
 *   // This only runs if enhanced-audit is enabled
 *   const result = await next();
 *   await logEnhancedAudit(ctx, result);
 *   return result;
 * });
 * ```
 */
export function whenFeatureEnabled(
  flagKey: string,
  middleware: FeatureFlagMiddleware
) {
  return async ({ ctx, next }: MiddlewareOptions): Promise<unknown> => {
    // Only pass context if we have a valid userOpenId
    const context = ctx.user?.openId
      ? { userOpenId: ctx.user.openId }
      : undefined;
    const isEnabled = await featureFlagService.isEnabled(flagKey, context);

    if (isEnabled) {
      return middleware({ ctx, next });
    }

    return next();
  };
}

/**
 * Helper to check multiple flags at once
 *
 * @param flags - Array of flag keys to check
 * @param mode - "all" requires all flags, "any" requires at least one
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Require both flags
 * .use(requireFlags(["credit-management", "advanced-pricing"], "all"))
 *
 * // Require at least one flag
 * .use(requireFlags(["beta-features", "early-access"], "any"))
 * ```
 */
export function requireFlags(flags: string[], mode: "all" | "any" = "all") {
  return async ({ ctx, next }: MiddlewareOptions): Promise<unknown> => {
    const context = ctx.user?.openId
      ? { userOpenId: ctx.user.openId }
      : undefined;

    const results = await Promise.all(
      flags.map(flag => featureFlagService.isEnabled(flag, context))
    );

    const isAllowed =
      mode === "all" ? results.every(r => r) : results.some(r => r);

    if (!isAllowed) {
      logger.warn(
        {
          flags,
          mode,
          results,
          userId: ctx.user?.id,
          userOpenId: ctx.user?.openId,
        },
        "[FeatureFlags] Multi-flag access denied"
      );

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Required features are not enabled for your account.`,
      });
    }

    return next();
  };
}
