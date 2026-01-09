/**
 * Permission Service
 * Handles Role-Based Access Control (RBAC) for calendar events
 *
 * Critical for Calendar & Scheduling Module Security
 * Version 2.0 - Post-Adversarial QA
 * Version 2.1 - Added caching layer (ST-010)
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  calendarEvents,
  calendarEventPermissions,
  type CalendarEvent,
} from "../../drizzle/schema";
import cache, { CacheKeys, CacheTTL } from "./cache";

export type PermissionLevel = "VIEW" | "EDIT" | "DELETE" | "MANAGE";
export type GrantType = "USER" | "ROLE" | "TEAM";

/**
 * Permission Service
 * Enforces row-level security for calendar events
 */
export class PermissionService {
  /**
   * Check if a user has a specific permission on an event
   *
   * ST-010: Added caching layer for performance
   * Cache TTL: 5 minutes
   * Cache invalidation: On permission grant/revoke
   */
  static async hasPermission(
    userId: number,
    eventId: number,
    requiredPermission: PermissionLevel
  ): Promise<boolean> {
    // Check cache first
    const cacheKey = CacheKeys.calendarEventPermission(userId, eventId, requiredPermission);
    const cached = cache.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get the event
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      // Cache negative result with shorter TTL
      cache.set(cacheKey, false, CacheTTL.SHORT);
      return false;
    }

    // Creator always has MANAGE permission
    if (event.createdBy === userId) {
      cache.set(cacheKey, true, CacheTTL.MEDIUM);
      return true;
    }

    // Assigned user has EDIT permission
    if (event.assignedTo === userId && this.isPermissionSufficient("EDIT", requiredPermission)) {
      cache.set(cacheKey, true, CacheTTL.MEDIUM);
      return true;
    }

    // Check visibility
    if (event.visibility === "COMPANY" && requiredPermission === "VIEW") {
      // All users in the company can view company-wide events
      cache.set(cacheKey, true, CacheTTL.MEDIUM);
      return true;
    }

    if (event.visibility === "PRIVATE" && requiredPermission === "VIEW") {
      // Only creator can view private events
      const hasPermission = event.createdBy === userId;
      cache.set(cacheKey, hasPermission, CacheTTL.MEDIUM);
      return hasPermission;
    }

    // Check explicit permissions
    const permissions = await db
      .select()
      .from(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.eventId, eventId),
          eq(calendarEventPermissions.grantType, "USER"),
          eq(calendarEventPermissions.granteeId, userId)
        )
      );

    for (const perm of permissions) {
      if (this.isPermissionSufficient(perm.permission, requiredPermission)) {
        cache.set(cacheKey, true, CacheTTL.MEDIUM);
        return true;
      }
    }

    cache.set(cacheKey, false, CacheTTL.MEDIUM);
    return false;
  }

  /**
   * Check if a permission level is sufficient for a required permission
   * Permission hierarchy: MANAGE > DELETE > EDIT > VIEW
   */
  static isPermissionSufficient(
    granted: PermissionLevel,
    required: PermissionLevel
  ): boolean {
    const hierarchy: Record<PermissionLevel, number> = {
      VIEW: 1,
      EDIT: 2,
      DELETE: 3,
      MANAGE: 4,
    };

    return hierarchy[granted] >= hierarchy[required];
  }

  /**
   * Require permission or throw error
   */
  static async requirePermission(
    userId: number,
    eventId: number,
    requiredPermission: PermissionLevel
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, eventId, requiredPermission);

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have ${requiredPermission} permission on this event.`,
      });
    }
  }

  /**
   * Grant permission to a user
   *
   * ST-010: Invalidates cache on permission changes
   */
  static async grantPermission(
    eventId: number,
    grantedBy: number,
    grantType: GrantType,
    granteeId: number,
    permission: PermissionLevel
  ): Promise<void> {
    // Verify the granter has MANAGE permission
    await this.requirePermission(grantedBy, eventId, "MANAGE");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if permission already exists
    const existing = await db
      .select()
      .from(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.eventId, eventId),
          eq(calendarEventPermissions.grantType, grantType),
          eq(calendarEventPermissions.granteeId, granteeId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing permission
      await db
        .update(calendarEventPermissions)
        .set({
          permission,
          grantedBy,
          grantedAt: new Date(),
        })
        .where(eq(calendarEventPermissions.id, existing[0].id));
    } else {
      // Create new permission
      await db.insert(calendarEventPermissions).values({
        eventId,
        grantType,
        granteeId,
        permission,
        grantedBy,
      });
    }

    // Invalidate cache for this user and event
    this.invalidatePermissionCache(granteeId, eventId);
  }

  /**
   * Revoke permission from a user
   *
   * ST-010: Invalidates cache on permission changes
   */
  static async revokePermission(
    eventId: number,
    revokedBy: number,
    grantType: GrantType,
    granteeId: number
  ): Promise<void> {
    // Verify the revoker has MANAGE permission
    await this.requirePermission(revokedBy, eventId, "MANAGE");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.eventId, eventId),
          eq(calendarEventPermissions.grantType, grantType),
          eq(calendarEventPermissions.granteeId, granteeId)
        )
      );

    // Invalidate cache for this user and event
    this.invalidatePermissionCache(granteeId, eventId);
  }

  /**
   * Get all permissions for an event
   */
  static async getEventPermissions(eventId: number, userId: number) {
    // Verify the user has VIEW permission
    await this.requirePermission(userId, eventId, "VIEW");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(calendarEventPermissions)
      .where(eq(calendarEventPermissions.eventId, eventId));
  }

  /**
   * Batch check permissions for multiple events
   * Returns a map of eventId -> hasPermission
   * This is a performance optimization to avoid N+1 queries
   * 
   * @param userId - The user ID to check permissions for
   * @param eventIds - Array of event IDs to check
   * @param requiredPermission - The permission level required
   * @returns Map of eventId to boolean (true if user has permission)
   */
  static async batchCheckPermissions(
    userId: number,
    eventIds: number[],
    requiredPermission: PermissionLevel
  ): Promise<Record<number, boolean>> {
    if (eventIds.length === 0) {
      return {};
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const permissionMap: Record<number, boolean> = {};

    // Fetch all events in a single query using inArray for efficiency
    const events = await db
      .select()
      .from(calendarEvents)
      .where(inArray(calendarEvents.id, eventIds));

    // Fetch all explicit permissions for these events in a single query
    const explicitPermissions = await db
      .select()
      .from(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.grantType, "USER"),
          eq(calendarEventPermissions.granteeId, userId),
          inArray(calendarEventPermissions.eventId, eventIds)
        )
      );

    // Build a map of eventId -> permission level
    const permissionLevelMap: Record<number, PermissionLevel[]> = {};
    for (const perm of explicitPermissions) {
      if (!permissionLevelMap[perm.eventId]) {
        permissionLevelMap[perm.eventId] = [];
      }
      permissionLevelMap[perm.eventId].push(perm.permission);
    }

    // Check permissions for each event
    for (const event of events) {
      // Creator always has MANAGE permission
      if (event.createdBy === userId) {
        permissionMap[event.id] = true;
        continue;
      }

      // Assigned user has EDIT permission
      if (event.assignedTo === userId && this.isPermissionSufficient("EDIT", requiredPermission)) {
        permissionMap[event.id] = true;
        continue;
      }

      // Check visibility
      if (event.visibility === "COMPANY" && requiredPermission === "VIEW") {
        permissionMap[event.id] = true;
        continue;
      }

      if (event.visibility === "PRIVATE" && requiredPermission === "VIEW") {
        permissionMap[event.id] = event.createdBy === userId;
        continue;
      }

      // Check explicit permissions
      const eventPermissions = permissionLevelMap[event.id] || [];
      let hasPermission = false;
      for (const perm of eventPermissions) {
        if (this.isPermissionSufficient(perm, requiredPermission)) {
          hasPermission = true;
          break;
        }
      }

      permissionMap[event.id] = hasPermission;
    }

    // For any event IDs that weren't found in the database, set to false
    for (const eventId of eventIds) {
      if (!(eventId in permissionMap)) {
        permissionMap[eventId] = false;
      }
    }

    return permissionMap;
  }

  /**
   * Filter events by user permissions
   * Returns only events the user has permission to view
   * 
   * @deprecated Use batchCheckPermissions for better performance
   */
  static async filterEventsByPermission(
    userId: number,
    events: CalendarEvent[]
  ): Promise<CalendarEvent[]> {
    const filtered: CalendarEvent[] = [];

    for (const event of events) {
      const hasPermission = await this.hasPermission(userId, event.id, "VIEW");
      if (hasPermission) {
        filtered.push(event);
      }
    }

    return filtered;
  }

  /**
   * Check if user can create events in a specific module
   * This is a simplified check - in production, you'd check against user roles
   */
  static async canCreateEvent(
    userId: number,
    module: string
  ): Promise<boolean> {
    // For now, all authenticated users can create events
    // In production, implement role-based checks
    return true;
  }

  /**
   * Check if user can modify event visibility
   */
  static async canModifyVisibility(
    userId: number,
    eventId: number
  ): Promise<boolean> {
    return await this.hasPermission(userId, eventId, "MANAGE");
  }

  /**
   * Check if user can add participants to an event
   */
  static async canAddParticipants(
    userId: number,
    eventId: number
  ): Promise<boolean> {
    return await this.hasPermission(userId, eventId, "EDIT");
  }

  /**
   * Check if user can modify event recurrence
   */
  static async canModifyRecurrence(
    userId: number,
    eventId: number
  ): Promise<boolean> {
    return await this.hasPermission(userId, eventId, "MANAGE");
  }

  /**
   * Get permission level for a user on an event
   * Returns the highest permission level the user has
   */
  static async getPermissionLevel(
    userId: number,
    eventId: number
  ): Promise<PermissionLevel | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get the event
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      return null;
    }

    // Creator has MANAGE
    if (event.createdBy === userId) {
      return "MANAGE";
    }

    // Assigned user has EDIT
    if (event.assignedTo === userId) {
      return "EDIT";
    }

    // Check explicit permissions
    const permissions = await db
      .select()
      .from(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.eventId, eventId),
          eq(calendarEventPermissions.grantType, "USER"),
          eq(calendarEventPermissions.granteeId, userId)
        )
      );

    if (permissions.length > 0) {
      // Return highest permission
      const hierarchy: Record<PermissionLevel, number> = {
        VIEW: 1,
        EDIT: 2,
        DELETE: 3,
        MANAGE: 4,
      };

      let highest: PermissionLevel = "VIEW";
      for (const perm of permissions) {
        if (hierarchy[perm.permission] > hierarchy[highest]) {
          highest = perm.permission;
        }
      }
      return highest;
    }

    // Check visibility
    if (event.visibility === "COMPANY") {
      return "VIEW";
    }

    return null;
  }

  /**
   * Invalidate permission cache for a user and event
   * Called when permissions are granted or revoked
   *
   * ST-010: Cache invalidation helper
   */
  static invalidatePermissionCache(userId: number, eventId: number): void {
    // Invalidate all permission levels for this user-event combination
    const permissionLevels: PermissionLevel[] = ["VIEW", "EDIT", "DELETE", "MANAGE"];
    for (const permission of permissionLevels) {
      const cacheKey = CacheKeys.calendarEventPermission(userId, eventId, permission);
      cache.delete(cacheKey);
    }
  }

  /**
   * Invalidate all permission caches for an event
   * Called when an event is deleted or significantly modified
   *
   * ST-010: Cache invalidation helper for events
   */
  static invalidateEventCache(eventId: number): void {
    const cacheKeyPattern = new RegExp(`^calendarEvent:${eventId}:`);
    cache.invalidatePattern(cacheKeyPattern);
  }

  /**
   * Invalidate all permission caches for a user
   * Called when user roles change
   *
   * ST-010: Cache invalidation helper for users
   */
  static invalidateUserCache(userId: number): void {
    const cacheKeyPattern = new RegExp(`:user:${userId}:`);
    cache.invalidatePattern(cacheKeyPattern);
  }
}

export default PermissionService;
