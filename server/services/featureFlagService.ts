// @ts-nocheck - TEMPORARY: Schema mismatch errors, needs Wave 1 fix
/**
 * Feature Flag Service
 * 
 * Provides feature flag evaluation with caching and override support.
 * All user identification uses openId (string) to match RBAC pattern.
 * 
 * Evaluation Priority:
 * 1. System disabled → always false
 * 2. Dependency check → if depends on disabled flag, false
 * 3. Module disabled → if module flag disabled, false
 * 4. User override → explicit user setting
 * 5. Role override → most permissive wins (any role enabled = enabled)
 * 6. Default value → fallback
 */

import { featureFlagsDb } from "../featureFlagsDb";
import cache, { CacheKeys, CacheTTL } from "../_core/cache";
import type { FeatureFlag } from "../../drizzle/schema";
import { logger } from "../_core/logger";

/**
 * Context for evaluating feature flags
 */
export interface EvaluationContext {
  /** User's openId (Clerk/OAuth ID) - CRITICAL: Use openId, NOT numeric id */
  userOpenId: string;
  /** Optional pre-fetched role IDs (will be fetched if not provided) */
  roleIds?: number[];
}

/**
 * Result of evaluating a feature flag
 */
export interface EvaluationResult {
  /** Whether the flag is enabled */
  enabled: boolean;
  /** Reason for the evaluation result */
  reason:
    | "system_disabled"
    | "dependency_disabled"
    | "module_disabled"
    | "user_override"
    | "role_override"
    | "default"
    | "not_found";
  /** The flag that was evaluated (null if not found) */
  flag: FeatureFlag | null;
}

/**
 * Feature Flag Service
 */
export const featureFlagService = {
  /**
   * Check if a feature flag is enabled for a user
   * 
   * @param key - The flag key to check
   * @param context - Optional evaluation context with user info
   * @returns Whether the flag is enabled
   */
  async isEnabled(key: string, context?: EvaluationContext): Promise<boolean> {
    const result = await this.evaluate(key, context);
    return result.enabled;
  },

  /**
   * Evaluate a flag with full context and reason
   * 
   * @param key - The flag key to evaluate
   * @param context - Optional evaluation context with user info
   * @returns Full evaluation result with reason
   */
  async evaluate(key: string, context?: EvaluationContext): Promise<EvaluationResult> {
    // Get flag (with caching)
    const cacheKey = CacheKeys.featureFlags.byKey(key);
    let flag = cache.get<FeatureFlag>(cacheKey);

    if (!flag) {
      const dbFlag = await featureFlagsDb.getByKey(key);
      if (dbFlag) {
        flag = dbFlag;
        cache.set(cacheKey, flag, CacheTTL.MEDIUM); // 5 minutes
      }
    }

    if (!flag) {
      logger.warn({ key }, "[FeatureFlags] Flag not found");
      return { enabled: false, reason: "not_found", flag: null };
    }

    // 1. System disabled check
    if (!flag.systemEnabled) {
      return { enabled: false, reason: "system_disabled", flag };
    }

    // 2. Dependency check (recursive)
    if (flag.dependsOn) {
      const depResult = await this.evaluate(flag.dependsOn, context);
      if (!depResult.enabled) {
        return { enabled: false, reason: "dependency_disabled", flag };
      }
    }

    // 3. Module check (if flag belongs to a module and isn't itself a module flag)
    if (flag.module && !flag.key.startsWith("module-")) {
      const moduleResult = await this.evaluate(flag.module, context);
      if (!moduleResult.enabled) {
        return { enabled: false, reason: "module_disabled", flag };
      }
    }

    // If no user context, return default
    if (!context?.userOpenId) {
      return { enabled: flag.defaultEnabled, reason: "default", flag };
    }

    // 4. User override check (USES openId)
    const userOverride = await featureFlagsDb.getUserOverride(flag.id, context.userOpenId);
    if (userOverride !== null) {
      return { enabled: userOverride, reason: "user_override", flag };
    }

    // 5. Role override check (most permissive wins)
    const roleIds = context.roleIds ?? await featureFlagsDb.getUserRoleIds(context.userOpenId);
    if (roleIds.length > 0) {
      const roleOverrides = await featureFlagsDb.getRoleOverrides(flag.id);
      const userRoleOverrides = roleOverrides.filter((ro) => roleIds.includes(ro.roleId));

      // Most permissive: if ANY role has enabled=true, return true
      if (userRoleOverrides.some((ro) => ro.enabled)) {
        return { enabled: true, reason: "role_override", flag };
      }
      // If ANY role has explicit override (even false), use that
      if (userRoleOverrides.length > 0) {
        return { enabled: false, reason: "role_override", flag };
      }
    }

    // 6. Default value
    return { enabled: flag.defaultEnabled, reason: "default", flag };
  },

  /**
   * Get all effective flags for a user (for frontend context)
   * 
   * @param context - Evaluation context with user info
   * @returns Map of flag keys to enabled status
   */
  async getEffectiveFlags(context: EvaluationContext): Promise<Record<string, boolean>> {
    const cacheKey = CacheKeys.featureFlags.userEffective(context.userOpenId);
    const cached = cache.get<Record<string, boolean>>(cacheKey);
    if (cached) return cached;

    const flags = await featureFlagsDb.getAll();
    const result: Record<string, boolean> = {};

    // Pre-fetch role IDs once for efficiency
    const roleIds = context.roleIds ?? await featureFlagsDb.getUserRoleIds(context.userOpenId);
    const contextWithRoles = { ...context, roleIds };

    for (const flag of flags) {
      const evaluation = await this.evaluate(flag.key, contextWithRoles);
      result[flag.key] = evaluation.enabled;
    }

    cache.set(cacheKey, result, CacheTTL.SHORT); // 1 minute
    return result;
  },

  /**
   * Check if a module is enabled
   * 
   * @param module - The module flag key (e.g., "module-accounting")
   * @param context - Optional evaluation context
   * @returns Whether the module is enabled
   */
  async isModuleEnabled(module: string, context?: EvaluationContext): Promise<boolean> {
    return this.isEnabled(module, context);
  },

  /**
   * Get all flags with their metadata (for admin UI)
   * 
   * @returns All active flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const cacheKey = CacheKeys.featureFlags.all();
    const cached = cache.get<FeatureFlag[]>(cacheKey);
    if (cached) return cached;

    const flags = await featureFlagsDb.getAll();
    cache.set(cacheKey, flags, CacheTTL.MEDIUM);
    return flags;
  },

  /**
   * Get flags by module
   * 
   * @param module - The module key
   * @returns Flags belonging to the module
   */
  async getFlagsByModule(module: string): Promise<FeatureFlag[]> {
    const cacheKey = CacheKeys.featureFlags.moduleFlags(module);
    const cached = cache.get<FeatureFlag[]>(cacheKey);
    if (cached) return cached;

    const flags = await featureFlagsDb.getByModule(module);
    cache.set(cacheKey, flags, CacheTTL.MEDIUM);
    return flags;
  },

  // ========================================================================
  // CACHE INVALIDATION
  // ========================================================================

  /**
   * Invalidate cache for a specific flag
   * 
   * @param key - The flag key to invalidate
   */
  invalidateFlagCache(key: string): void {
    cache.delete(CacheKeys.featureFlags.byKey(key));
    cache.delete(CacheKeys.featureFlags.all());
    logger.debug({ key }, "[FeatureFlags] Flag cache invalidated");
  },

  /**
   * Invalidate user's effective flags cache
   * 
   * @param userOpenId - The user's openId
   */
  invalidateUserCache(userOpenId: string): void {
    cache.delete(CacheKeys.featureFlags.userEffective(userOpenId));
    logger.debug({ userOpenId }, "[FeatureFlags] User cache invalidated");
  },

  /**
   * Invalidate all feature flag caches
   */
  invalidateAllCaches(): void {
    cache.invalidatePattern(/^featureFlags:/);
    logger.debug("[FeatureFlags] All caches invalidated");
  },

  // ========================================================================
  // ADMIN OPERATIONS (delegated to featureFlagsDb)
  // ========================================================================

  /**
   * Create a new flag
   */
  async createFlag(
    flag: Parameters<typeof featureFlagsDb.create>[0],
    actorOpenId: string
  ): Promise<number> {
    const flagId = await featureFlagsDb.create(flag, actorOpenId);
    this.invalidateAllCaches();
    return flagId;
  },

  /**
   * Update a flag
   */
  async updateFlag(
    id: number,
    updates: Parameters<typeof featureFlagsDb.update>[1],
    actorOpenId: string
  ): Promise<void> {
    await featureFlagsDb.update(id, updates, actorOpenId);
    this.invalidateAllCaches();
  },

  /**
   * Delete a flag (soft delete)
   */
  async deleteFlag(id: number, actorOpenId: string): Promise<void> {
    await featureFlagsDb.softDelete(id, actorOpenId);
    this.invalidateAllCaches();
  },

  /**
   * Set role override
   */
  async setRoleOverride(
    flagId: number,
    roleId: number,
    enabled: boolean,
    actorOpenId: string
  ): Promise<void> {
    await featureFlagsDb.setRoleOverride(flagId, roleId, enabled, actorOpenId);
    this.invalidateAllCaches();
  },

  /**
   * Remove role override
   */
  async removeRoleOverride(
    flagId: number,
    roleId: number,
    actorOpenId: string
  ): Promise<void> {
    await featureFlagsDb.removeRoleOverride(flagId, roleId, actorOpenId);
    this.invalidateAllCaches();
  },

  /**
   * Set user override
   */
  async setUserOverride(
    flagId: number,
    userOpenId: string,
    enabled: boolean,
    actorOpenId: string
  ): Promise<void> {
    await featureFlagsDb.setUserOverride(flagId, userOpenId, enabled, actorOpenId);
    this.invalidateUserCache(userOpenId);
  },

  /**
   * Remove user override
   */
  async removeUserOverride(
    flagId: number,
    userOpenId: string,
    actorOpenId: string
  ): Promise<void> {
    await featureFlagsDb.removeUserOverride(flagId, userOpenId, actorOpenId);
    this.invalidateUserCache(userOpenId);
  },

  /**
   * Get audit history
   */
  async getAuditHistory(flagKey?: string, limit?: number) {
    return featureFlagsDb.getAuditHistory(flagKey, limit);
  },
};
