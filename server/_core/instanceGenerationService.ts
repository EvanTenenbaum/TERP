/**
 * Instance Generation Service
 * Generates materialized recurrence instances for recurring events
 * 
 * Critical for Calendar & Scheduling Module Performance
 * Version 2.0 - Post-Adversarial QA
 */

import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  calendarEvents,
  calendarRecurrenceRules,
  calendarRecurrenceInstances,
  type CalendarRecurrenceRule,
} from "../../drizzle/schema";
import TimezoneService from "./timezoneService";
import { logger } from "./logger";

/**
 * Instance Generation Service
 * Pre-computes recurrence instances for performance
 */
export class InstanceGenerationService {
  /**
   * Generate instances for a recurring event
   * Generates instances for the next N days
   */
  static async generateInstances(
    eventId: number,
    daysAhead: number = 90
  ): Promise<number> {
    const db = await getDb();

    // Get the event
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event || !event.isRecurring) {
      return 0;
    }

    // Get the recurrence rule
    const [rule] = await db
      .select()
      .from(calendarRecurrenceRules)
      .where(eq(calendarRecurrenceRules.eventId, eventId))
      .limit(1);

    if (!rule) {
      return 0;
    }

    // Calculate end date for generation
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Generate instances
    const instances = this.calculateInstances(event, rule, endDate);

    // Delete existing instances in this range
    await db
      .delete(calendarRecurrenceInstances)
      .where(
        and(
          eq(calendarRecurrenceInstances.parentEventId, eventId),
          gte(calendarRecurrenceInstances.instanceDate, today.toISOString().split("T")[0]),
          lte(calendarRecurrenceInstances.instanceDate, endDate.toISOString().split("T")[0])
        )
      );

    // Insert new instances
    if (instances.length > 0) {
      await db.insert(calendarRecurrenceInstances).values(instances);
    }

    return instances.length;
  }

  /**
   * Calculate recurrence instances based on rule
   */
  private static calculateInstances(
    event: any,
    rule: CalendarRecurrenceRule,
    endDate: Date
  ): Array<{
    parentEventId: number;
    instanceDate: string;
    startTime: string | null;
    endTime: string | null;
    timezone: string | null;
    status: "GENERATED" | "MODIFIED" | "CANCELLED";
  }> {
    const instances: Array<{
      parentEventId: number;
      instanceDate: string;
      startTime: string | null;
      endTime: string | null;
      timezone: string | null;
      status: "GENERATED" | "MODIFIED" | "CANCELLED";
    }> = [];

    const startDate = new Date(rule.startDate);
    const ruleEndDate = rule.endDate ? new Date(rule.endDate) : endDate;
    const maxEndDate = ruleEndDate < endDate ? ruleEndDate : endDate;

    let currentDate = new Date(startDate);
    let count = 0;
    const maxCount = rule.count || 1000; // Safety limit

    while (currentDate <= maxEndDate && count < maxCount) {
      const dateString = currentDate.toISOString().split("T")[0];

      // Check if this date is in exception dates
      if (rule.exceptionDates && rule.exceptionDates.includes(dateString)) {
        this.incrementDate(currentDate, rule.frequency, rule.interval);
        continue;
      }

      // Check if this date matches the recurrence pattern
      if (this.matchesRecurrencePattern(currentDate, rule)) {
        instances.push({
          parentEventId: event.id,
          instanceDate: dateString,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          status: "GENERATED",
        });
        count++;
      }

      this.incrementDate(currentDate, rule.frequency, rule.interval);
    }

    return instances;
  }

  /**
   * Check if a date matches the recurrence pattern
   */
  private static matchesRecurrencePattern(
    date: Date,
    rule: CalendarRecurrenceRule
  ): boolean {
    switch (rule.frequency) {
      case "DAILY":
        return true; // Every day matches

      case "WEEKLY":
        if (!rule.byDay || rule.byDay.length === 0) {
          return true; // If no specific days, match all
        }
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        return rule.byDay.includes(dayOfWeek);

      case "MONTHLY":
        if (rule.byMonthDay && rule.byMonthDay.length > 0) {
          const dayOfMonth = date.getDate();
          return rule.byMonthDay.includes(dayOfMonth);
        }
        if (rule.byDayOfWeekInMonth && rule.byDayOfWeekInMonth.length > 0) {
          return this.matchesDayOfWeekInMonth(date, rule.byDayOfWeekInMonth);
        }
        return true; // If no specific pattern, match all

      case "YEARLY":
        if (rule.byMonth && rule.byMonth.length > 0) {
          const month = date.getMonth() + 1; // 0-indexed to 1-indexed
          return rule.byMonth.includes(month);
        }
        return true; // If no specific months, match all

      default:
        return false;
    }
  }

  /**
   * Check if a date matches "Nth weekday of month" pattern
   * e.g., "2nd Tuesday of every month"
   */
  private static matchesDayOfWeekInMonth(
    date: Date,
    patterns: Array<{ week: number; day: number }>
  ): boolean {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);

    for (const pattern of patterns) {
      if (pattern.day === dayOfWeek && pattern.week === weekOfMonth) {
        return true;
      }
    }

    return false;
  }

  /**
   * Increment date based on frequency and interval
   */
  private static incrementDate(
    date: Date,
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    interval: number
  ): void {
    switch (frequency) {
      case "DAILY":
        date.setDate(date.getDate() + interval);
        break;
      case "WEEKLY":
        date.setDate(date.getDate() + (7 * interval));
        break;
      case "MONTHLY":
        date.setMonth(date.getMonth() + interval);
        break;
      case "YEARLY":
        date.setFullYear(date.getFullYear() + interval);
        break;
    }
  }

  /**
   * Regenerate instances for all recurring events
   * This is called by the background job
   */
  static async regenerateAllInstances(daysAhead: number = 90): Promise<number> {
    const db = await getDb();

    // Get all recurring events
    const recurringEvents = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.isRecurring, true));

    let totalGenerated = 0;

    for (const event of recurringEvents) {
      try {
        const count = await this.generateInstances(event.id, daysAhead);
        totalGenerated += count;
      } catch (error) {
        logger.error(`Failed to generate instances for event ${event.id}:`, error);
      }
    }

    return totalGenerated;
  }

  /**
   * Modify a specific instance of a recurring event
   */
  static async modifyInstance(
    parentEventId: number,
    instanceDate: string,
    modifications: {
      title?: string;
      description?: string;
      location?: string;
      assignedTo?: number;
      startTime?: string;
      endTime?: string;
    },
    modifiedBy: number
  ): Promise<void> {
    const db = await getDb();

    // Find the instance
    const [instance] = await db
      .select()
      .from(calendarRecurrenceInstances)
      .where(
        and(
          eq(calendarRecurrenceInstances.parentEventId, parentEventId),
          eq(calendarRecurrenceInstances.instanceDate, instanceDate)
        )
      )
      .limit(1);

    if (!instance) {
      throw new Error("Instance not found");
    }

    // Update the instance
    await db
      .update(calendarRecurrenceInstances)
      .set({
        status: "MODIFIED",
        modifiedTitle: modifications.title,
        modifiedDescription: modifications.description,
        modifiedLocation: modifications.location,
        modifiedAssignedTo: modifications.assignedTo,
        startTime: modifications.startTime || instance.startTime,
        endTime: modifications.endTime || instance.endTime,
        modifiedAt: new Date(),
        modifiedBy,
      })
      .where(eq(calendarRecurrenceInstances.id, instance.id));
  }

  /**
   * Cancel a specific instance of a recurring event
   */
  static async cancelInstance(
    parentEventId: number,
    instanceDate: string
  ): Promise<void> {
    const db = await getDb();

    await db
      .update(calendarRecurrenceInstances)
      .set({
        status: "CANCELLED",
      })
      .where(
        and(
          eq(calendarRecurrenceInstances.parentEventId, parentEventId),
          eq(calendarRecurrenceInstances.instanceDate, instanceDate)
        )
      );
  }

  /**
   * Get instances for a date range
   */
  static async getInstances(
    parentEventId: number,
    startDate: string,
    endDate: string
  ) {
    const db = await getDb();

    return await db
      .select()
      .from(calendarRecurrenceInstances)
      .where(
        and(
          eq(calendarRecurrenceInstances.parentEventId, parentEventId),
          gte(calendarRecurrenceInstances.instanceDate, startDate),
          lte(calendarRecurrenceInstances.instanceDate, endDate)
        )
      );
  }

  /**
   * Clean up old instances
   * Remove instances older than N days
   */
  static async cleanupOldInstances(daysToKeep: number = 30): Promise<number> {
    const db = await getDb();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateString = cutoffDate.toISOString().split("T")[0];

    const result = await db
      .delete(calendarRecurrenceInstances)
      .where(lte(calendarRecurrenceInstances.instanceDate, cutoffDateString));

    return result.rowsAffected || 0;
  }
}

export default InstanceGenerationService;
