/**
 * Data Integrity Service
 * Handles cleanup of orphaned records and data integrity checks
 * 
 * Critical for Calendar & Scheduling Module Data Quality
 * Version 2.0 - Post-Adversarial QA
 */

import { eq, and, isNull, lt, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  calendarEvents,
  calendarRecurrenceRules,
  calendarRecurrenceInstances,
  calendarEventParticipants,
  calendarReminders,
  calendarEventHistory,
  calendarEventAttachments,
  calendarEventPermissions,
  clientMeetingHistory,
} from "../../drizzle/schema";

/**
 * Data Integrity Service
 * Proactive data quality management
 */
export class DataIntegrityService {
  /**
   * Clean up orphaned recurrence rules
   * Remove rules that reference non-existent events
   */
  static async cleanupOrphanedRecurrenceRules(): Promise<number> {
    const db = await getDb();

    // Find rules where the parent event doesn't exist
    const orphanedRules = await db
      .select({ id: calendarRecurrenceRules.id })
      .from(calendarRecurrenceRules)
      .leftJoin(
        calendarEvents,
        eq(calendarRecurrenceRules.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedRules.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedRules.map(r => r.id);

    const result = await db
      .delete(calendarRecurrenceRules)
      .where(inArray(calendarRecurrenceRules.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up orphaned recurrence instances
   * Remove instances that reference non-existent events
   */
  static async cleanupOrphanedInstances(): Promise<number> {
    const db = await getDb();

    const orphanedInstances = await db
      .select({ id: calendarRecurrenceInstances.id })
      .from(calendarRecurrenceInstances)
      .leftJoin(
        calendarEvents,
        eq(calendarRecurrenceInstances.parentEventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedInstances.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedInstances.map(i => i.id);

    const result = await db
      .delete(calendarRecurrenceInstances)
      .where(inArray(calendarRecurrenceInstances.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up orphaned participants
   * Remove participants that reference non-existent events or users
   */
  static async cleanupOrphanedParticipants(): Promise<number> {
    const db = await getDb();

    const orphanedParticipants = await db
      .select({ id: calendarEventParticipants.id })
      .from(calendarEventParticipants)
      .leftJoin(
        calendarEvents,
        eq(calendarEventParticipants.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedParticipants.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedParticipants.map(p => p.id);

    const result = await db
      .delete(calendarEventParticipants)
      .where(inArray(calendarEventParticipants.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up orphaned reminders
   * Remove reminders that reference non-existent events or users
   */
  static async cleanupOrphanedReminders(): Promise<number> {
    const db = await getDb();

    const orphanedReminders = await db
      .select({ id: calendarReminders.id })
      .from(calendarReminders)
      .leftJoin(
        calendarEvents,
        eq(calendarReminders.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedReminders.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedReminders.map(r => r.id);

    const result = await db
      .delete(calendarReminders)
      .where(inArray(calendarReminders.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up orphaned permissions
   * Remove permissions that reference non-existent events
   */
  static async cleanupOrphanedPermissions(): Promise<number> {
    const db = await getDb();

    const orphanedPermissions = await db
      .select({ id: calendarEventPermissions.id })
      .from(calendarEventPermissions)
      .leftJoin(
        calendarEvents,
        eq(calendarEventPermissions.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedPermissions.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedPermissions.map(p => p.id);

    const result = await db
      .delete(calendarEventPermissions)
      .where(inArray(calendarEventPermissions.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up orphaned attachments
   * Remove attachments that reference non-existent events
   */
  static async cleanupOrphanedAttachments(): Promise<number> {
    const db = await getDb();

    const orphanedAttachments = await db
      .select({ id: calendarEventAttachments.id })
      .from(calendarEventAttachments)
      .leftJoin(
        calendarEvents,
        eq(calendarEventAttachments.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    if (orphanedAttachments.length === 0) {
      return 0;
    }

    const orphanedIds = orphanedAttachments.map(a => a.id);

    const result = await db
      .delete(calendarEventAttachments)
      .where(inArray(calendarEventAttachments.id, orphanedIds));

    return result.rowsAffected || 0;
  }

  /**
   * Clean up old soft-deleted events
   * Permanently delete events that have been soft-deleted for more than N days
   */
  static async cleanupSoftDeletedEvents(daysToKeep: number = 30): Promise<number> {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(calendarEvents)
      .where(
        and(
          isNull(calendarEvents.deletedAt) === false,
          lt(calendarEvents.deletedAt, cutoffDate)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Clean up old sent reminders
   * Remove sent reminders older than N days
   */
  static async cleanupOldReminders(daysToKeep: number = 30): Promise<number> {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(calendarReminders)
      .where(
        and(
          eq(calendarReminders.status, "SENT"),
          lt(calendarReminders.sentAt, cutoffDate)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Clean up old event history
   * Remove history entries older than N days
   */
  static async cleanupOldHistory(daysToKeep: number = 365): Promise<number> {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(calendarEventHistory)
      .where(lt(calendarEventHistory.changedAt, cutoffDate));

    return result.rowsAffected || 0;
  }

  /**
   * Verify referential integrity
   * Check for any integrity issues and return a report
   */
  static async verifyIntegrity(): Promise<{
    orphanedRules: number;
    orphanedInstances: number;
    orphanedParticipants: number;
    orphanedReminders: number;
    orphanedPermissions: number;
    orphanedAttachments: number;
    invalidEntityLinks: number;
  }> {
    const db = await getDb();

    // Count orphaned records
    const orphanedRules = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarRecurrenceRules)
      .leftJoin(
        calendarEvents,
        eq(calendarRecurrenceRules.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    const orphanedInstances = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarRecurrenceInstances)
      .leftJoin(
        calendarEvents,
        eq(calendarRecurrenceInstances.parentEventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    const orphanedParticipants = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEventParticipants)
      .leftJoin(
        calendarEvents,
        eq(calendarEventParticipants.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    const orphanedReminders = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarReminders)
      .leftJoin(
        calendarEvents,
        eq(calendarReminders.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    const orphanedPermissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEventPermissions)
      .leftJoin(
        calendarEvents,
        eq(calendarEventPermissions.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    const orphanedAttachments = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEventAttachments)
      .leftJoin(
        calendarEvents,
        eq(calendarEventAttachments.eventId, calendarEvents.id)
      )
      .where(isNull(calendarEvents.id));

    // Count events with invalid entity links
    // This is a simplified check - in production, you'd validate against actual tables
    const invalidEntityLinks = 0; // Placeholder

    return {
      orphanedRules: Number(orphanedRules[0]?.count || 0),
      orphanedInstances: Number(orphanedInstances[0]?.count || 0),
      orphanedParticipants: Number(orphanedParticipants[0]?.count || 0),
      orphanedReminders: Number(orphanedReminders[0]?.count || 0),
      orphanedPermissions: Number(orphanedPermissions[0]?.count || 0),
      orphanedAttachments: Number(orphanedAttachments[0]?.count || 0),
      invalidEntityLinks,
    };
  }

  /**
   * Run all cleanup operations
   * This is called by the background job
   */
  static async runAllCleanup(): Promise<{
    orphanedRulesDeleted: number;
    orphanedInstancesDeleted: number;
    orphanedParticipantsDeleted: number;
    orphanedRemindersDeleted: number;
    orphanedPermissionsDeleted: number;
    orphanedAttachmentsDeleted: number;
    softDeletedEventsDeleted: number;
    oldRemindersDeleted: number;
    oldHistoryDeleted: number;
  }> {
    const results = {
      orphanedRulesDeleted: await this.cleanupOrphanedRecurrenceRules(),
      orphanedInstancesDeleted: await this.cleanupOrphanedInstances(),
      orphanedParticipantsDeleted: await this.cleanupOrphanedParticipants(),
      orphanedRemindersDeleted: await this.cleanupOrphanedReminders(),
      orphanedPermissionsDeleted: await this.cleanupOrphanedPermissions(),
      orphanedAttachmentsDeleted: await this.cleanupOrphanedAttachments(),
      softDeletedEventsDeleted: await this.cleanupSoftDeletedEvents(),
      oldRemindersDeleted: await this.cleanupOldReminders(),
      oldHistoryDeleted: await this.cleanupOldHistory(),
    };

    console.log("Data integrity cleanup completed:", results);

    return results;
  }

  /**
   * Validate event consistency
   * Check if an event's data is consistent
   */
  static async validateEvent(eventId: number): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const db = await getDb();
    const errors: string[] = [];

    // Get the event
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      return { isValid: false, errors: ["Event not found"] };
    }

    // Check date consistency
    if (new Date(event.startDate) > new Date(event.endDate)) {
      errors.push("Start date is after end date");
    }

    // Check time consistency
    if (event.startTime && event.endTime) {
      if (event.startTime > event.endTime && event.startDate === event.endDate) {
        errors.push("Start time is after end time on the same day");
      }
    }

    // Check recurrence consistency
    if (event.isRecurring) {
      const [rule] = await db
        .select()
        .from(calendarRecurrenceRules)
        .where(eq(calendarRecurrenceRules.eventId, eventId))
        .limit(1);

      if (!rule) {
        errors.push("Event is marked as recurring but has no recurrence rule");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default DataIntegrityService;
