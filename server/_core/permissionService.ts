/**
 * Permission Service
 * Handles Role-Based Access Control (RBAC) for calendar events
 * 
 * Critical for Calendar & Scheduling Module Security
 * Version 2.0 - Post-Adversarial QA
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  calendarEvents,
  calendarEventPermissions,
  type CalendarEvent,
} from "../../drizzle/schema";

export type PermissionLevel = "VIEW" | "EDIT" | "DELETE" | "MANAGE";
export type GrantType = "USER" | "ROLE" | "TEAM";

/**
 * Permission Service
 * Enforces row-level security for calendar events
 */
export class PermissionService {
  /**
   * Check if a user has a specific permission on an event
   */
  static async hasPermission(
    userId: number,
    eventId: number,
    requiredPermission: PermissionLevel
  ): Promise<boolean> {
    const db = await getDb();

    // Get the event
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      return false;
    }

    // Creator always has MANAGE permission
    if (event.createdBy === userId) {
      return true;
    }

    // Assigned user has EDIT permission
    if (event.assignedTo === userId && this.isPermissionSufficient("EDIT", requiredPermission)) {
      return true;
    }

    // Check visibility
    if (event.visibility === "COMPANY" && requiredPermission === "VIEW") {
      // All users in the company can view company-wide events
      return true;
    }

    if (event.visibility === "PRIVATE" && requiredPermission === "VIEW") {
      // Only creator can view private events
      return event.createdBy === userId;
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
        return true;
      }
    }

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
  }

  /**
   * Revoke permission from a user
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

    await db
      .delete(calendarEventPermissions)
      .where(
        and(
          eq(calendarEventPermissions.eventId, eventId),
          eq(calendarEventPermissions.grantType, grantType),
          eq(calendarEventPermissions.granteeId, granteeId)
        )
      );
  }

  /**
   * Get all permissions for an event
   */
  static async getEventPermissions(eventId: number, userId: number) {
    // Verify the user has VIEW permission
    await this.requirePermission(userId, eventId, "VIEW");

    const db = await getDb();

    return await db
      .select()
      .from(calendarEventPermissions)
      .where(eq(calendarEventPermissions.eventId, eventId));
  }

  /**
   * Filter events by user permissions
   * Returns only events the user has permission to view
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
}

export default PermissionService;
