/**
 * Feature Flags Database Access Layer
 * 
 * Provides database operations for the feature flag system.
 * All user identification uses openId (string) to match RBAC pattern.
 */

import { db } from "./db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import {
  featureFlags,
  featureFlagRoleOverrides,
  featureFlagUserOverrides,
  featureFlagAuditLogs,
  type FeatureFlag,
  type NewFeatureFlag,
  type FeatureFlagRoleOverride,
  type FeatureFlagUserOverride,
  type FeatureFlagAuditLog,
} from "../drizzle/schema";
import { userRoles } from "../drizzle/schema-rbac";
import { logger } from "./_core/logger";

/**
 * Helper function to insert audit log using raw SQL
 * This avoids the Drizzle ORM issue with AUTO_INCREMENT columns
 */
async function insertAuditLog(
  flagId: number | null,
  flagKey: string,
  action: string,
  actorOpenId: string,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Promise<void> {
  if (!db) return;
  
  const prevJson = previousValue ? JSON.stringify(previousValue) : null;
  const newJson = newValue ? JSON.stringify(newValue) : null;
  
  try {
    // Use parameterized query with explicit NULL handling
    const flagIdValue = flagId === null ? sql`NULL` : sql`${flagId}`;
    const prevValue = prevJson === null ? sql`NULL` : sql`${prevJson}`;
    const newValue2 = newJson === null ? sql`NULL` : sql`${newJson}`;
    
    await db.execute(sql`
      INSERT INTO feature_flag_audit_logs 
        (flag_id, flag_key, action, actor_open_id, previous_value, new_value)
      VALUES 
        (${flagIdValue}, ${flagKey}, ${action}, ${actorOpenId}, ${prevValue}, ${newValue2})
    `);
    logger.info({ flagKey, action, actorOpenId }, "[FeatureFlags] Audit log created");
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    logger.error({ error, flagKey, action }, "[FeatureFlags] Failed to insert audit log");
  }
}

/**
 * Feature Flags Database Operations
 */
export const featureFlagsDb = {
  // ========================================================================
  // FLAG OPERATIONS
  // ========================================================================

  /**
   * Get all active (non-deleted) flags
   */
  async getAll(): Promise<FeatureFlag[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db
      .select()
      .from(featureFlags)
      .where(isNull(featureFlags.deletedAt));
  },

  /**
   * Get a flag by its unique key
   */
  async getByKey(key: string): Promise<FeatureFlag | undefined> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return undefined;
    }
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.key, key), isNull(featureFlags.deletedAt)))
      .limit(1);
    return flag;
  },

  /**
   * Get a flag by ID
   */
  async getById(id: number): Promise<FeatureFlag | undefined> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return undefined;
    }
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.id, id), isNull(featureFlags.deletedAt)))
      .limit(1);
    return flag;
  },

  /**
   * Get all flags belonging to a module
   */
  async getByModule(module: string): Promise<FeatureFlag[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.module, module), isNull(featureFlags.deletedAt)));
  },

  /**
   * Create a new flag
   */
  async create(flag: NewFeatureFlag, actorOpenId: string): Promise<number> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    const [result] = await db.insert(featureFlags).values(flag);
    const flagId = result.insertId;

    // Create audit log using raw SQL
    await insertAuditLog(
      flagId,
      flag.key,
      "created",
      actorOpenId,
      null,
      flag as Record<string, unknown>
    );

    logger.info({ flagKey: flag.key, flagId, actorOpenId }, "[FeatureFlags] Flag created");
    return flagId;
  },

  /**
   * Update an existing flag
   */
  async update(
    id: number,
    updates: Partial<Omit<FeatureFlag, "id" | "key" | "createdAt">>,
    actorOpenId: string
  ): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    // Get existing flag for audit log
    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id));

    if (!existing) {
      throw new Error(`Flag with id ${id} not found`);
    }

    await db
      .update(featureFlags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(featureFlags.id, id));

    // Determine action type
    let action: "updated" | "enabled" | "disabled" = "updated";
    if (updates.systemEnabled === true && !existing.systemEnabled) {
      action = "enabled";
    } else if (updates.systemEnabled === false && existing.systemEnabled) {
      action = "disabled";
    }

    // Create audit log using raw SQL
    await insertAuditLog(
      id,
      existing.key,
      action,
      actorOpenId,
      existing as Record<string, unknown>,
      updates as Record<string, unknown>
    );

    logger.info({ flagKey: existing.key, flagId: id, actorOpenId, action }, "[FeatureFlags] Flag updated");
  },

  /**
   * Soft delete a flag
   */
  async softDelete(id: number, actorOpenId: string): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id));

    if (!existing) {
      throw new Error(`Flag with id ${id} not found`);
    }

    await db
      .update(featureFlags)
      .set({ deletedAt: new Date() })
      .where(eq(featureFlags.id, id));

    // Create audit log using raw SQL
    await insertAuditLog(
      id,
      existing.key,
      "deleted",
      actorOpenId,
      existing as Record<string, unknown>,
      null
    );

    logger.info({ flagKey: existing.key, flagId: id, actorOpenId }, "[FeatureFlags] Flag deleted");
  },

  // ========================================================================
  // ROLE OVERRIDE OPERATIONS
  // ========================================================================

  /**
   * Get user's role IDs from RBAC system
   * USES openId (string), NOT numeric id
   */
  async getUserRoleIds(userOpenId: string): Promise<number[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    const roles = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userOpenId));
    return roles.map((r) => r.roleId);
  },

  /**
   * Get all role overrides for a flag
   */
  async getRoleOverrides(flagId: number): Promise<{ roleId: number; enabled: boolean }[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db
      .select({
        roleId: featureFlagRoleOverrides.roleId,
        enabled: featureFlagRoleOverrides.enabled,
      })
      .from(featureFlagRoleOverrides)
      .where(eq(featureFlagRoleOverrides.flagId, flagId));
  },

  /**
   * Set or update a role override
   */
  async setRoleOverride(
    flagId: number,
    roleId: number,
    enabled: boolean,
    actorOpenId: string
  ): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    await db
      .insert(featureFlagRoleOverrides)
      .values({ flagId, roleId, enabled, createdBy: actorOpenId })
      .onDuplicateKeyUpdate({ set: { enabled, createdBy: actorOpenId } });

    // Get flag key for audit log
    const [flag] = await db
      .select({ key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId));

    // Create audit log using raw SQL
    await insertAuditLog(
      flagId,
      flag?.key || "unknown",
      "override_added",
      actorOpenId,
      null,
      { type: "role", roleId, enabled }
    );

    logger.info({ flagId, roleId, enabled, actorOpenId }, "[FeatureFlags] Role override set");
  },

  /**
   * Remove a role override
   */
  async removeRoleOverride(flagId: number, roleId: number, actorOpenId: string): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    await db
      .delete(featureFlagRoleOverrides)
      .where(
        and(
          eq(featureFlagRoleOverrides.flagId, flagId),
          eq(featureFlagRoleOverrides.roleId, roleId)
        )
      );

    // Get flag key for audit log
    const [flag] = await db
      .select({ key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId));

    // Create audit log using raw SQL
    await insertAuditLog(
      flagId,
      flag?.key || "unknown",
      "override_removed",
      actorOpenId,
      { type: "role", roleId },
      null
    );

    logger.info({ flagId, roleId, actorOpenId }, "[FeatureFlags] Role override removed");
  },

  // ========================================================================
  // USER OVERRIDE OPERATIONS
  // ========================================================================

  /**
   * Get user override for a flag
   * USES openId (string), NOT numeric id
   */
  async getUserOverride(flagId: number, userOpenId: string): Promise<boolean | null> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return null;
    }
    const [override] = await db
      .select({ enabled: featureFlagUserOverrides.enabled })
      .from(featureFlagUserOverrides)
      .where(
        and(
          eq(featureFlagUserOverrides.flagId, flagId),
          eq(featureFlagUserOverrides.userOpenId, userOpenId)
        )
      )
      .limit(1);
    return override?.enabled ?? null;
  },

  /**
   * Set or update a user override
   * USES openId (string), NOT numeric id
   */
  async setUserOverride(
    flagId: number,
    userOpenId: string,
    enabled: boolean,
    actorOpenId: string
  ): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    await db
      .insert(featureFlagUserOverrides)
      .values({ flagId, userOpenId, enabled, createdBy: actorOpenId })
      .onDuplicateKeyUpdate({ set: { enabled, createdBy: actorOpenId } });

    // Get flag key for audit log
    const [flag] = await db
      .select({ key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId));

    // Create audit log using raw SQL
    await insertAuditLog(
      flagId,
      flag?.key || "unknown",
      "override_added",
      actorOpenId,
      null,
      { type: "user", userOpenId, enabled }
    );

    logger.info({ flagId, userOpenId, enabled, actorOpenId }, "[FeatureFlags] User override set");
  },

  /**
   * Remove a user override
   * USES openId (string), NOT numeric id
   */
  async removeUserOverride(
    flagId: number,
    userOpenId: string,
    actorOpenId: string
  ): Promise<void> {
    if (!db) {
      throw new Error("[FeatureFlags] Database not available");
    }

    await db
      .delete(featureFlagUserOverrides)
      .where(
        and(
          eq(featureFlagUserOverrides.flagId, flagId),
          eq(featureFlagUserOverrides.userOpenId, userOpenId)
        )
      );

    // Get flag key for audit log
    const [flag] = await db
      .select({ key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId));

    // Create audit log using raw SQL
    await insertAuditLog(
      flagId,
      flag?.key || "unknown",
      "override_removed",
      actorOpenId,
      { type: "user", userOpenId },
      null
    );

    logger.info({ flagId, userOpenId, actorOpenId }, "[FeatureFlags] User override removed");
  },

  // ========================================================================
  // AUDIT LOG OPERATIONS
  // ========================================================================

  /**
   * Get audit logs for a flag or all flags
   */
  async getAuditLogs(
    flagKey?: string,
    limit: number = 100
  ): Promise<FeatureFlagAuditLog[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }

    if (flagKey) {
      return db
        .select()
        .from(featureFlagAuditLogs)
        .where(eq(featureFlagAuditLogs.flagKey, flagKey))
        .orderBy(desc(featureFlagAuditLogs.createdAt))
        .limit(limit);
    }

    return db
      .select()
      .from(featureFlagAuditLogs)
      .orderBy(desc(featureFlagAuditLogs.createdAt))
      .limit(limit);
  },

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  /**
   * Get all role overrides for multiple flags (for efficient batch loading)
   */
  async getAllRoleOverrides(): Promise<FeatureFlagRoleOverride[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db.select().from(featureFlagRoleOverrides);
  },

  /**
   * Get all user overrides for a specific user (for efficient batch loading)
   * USES openId (string), NOT numeric id
   */
  async getAllUserOverrides(userOpenId: string): Promise<FeatureFlagUserOverride[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db
      .select()
      .from(featureFlagUserOverrides)
      .where(eq(featureFlagUserOverrides.userOpenId, userOpenId));
  },

  /**
   * Get all user overrides for a specific flag
   */
  async getFlagUserOverrides(flagId: number): Promise<FeatureFlagUserOverride[]> {
    if (!db) {
      logger.warn("[FeatureFlags] Database not available");
      return [];
    }
    return db
      .select()
      .from(featureFlagUserOverrides)
      .where(eq(featureFlagUserOverrides.flagId, flagId));
  },
};
