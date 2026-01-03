/**
 * Calendar Background Jobs
 * Automated maintenance and notification jobs for Calendar & Scheduling Module
 * Version 2.0 - Post-Adversarial QA
 */

import InstanceGenerationService from "./instanceGenerationService";
import DataIntegrityService from "./dataIntegrityService";
import * as calendarDb from "../calendarDb";
import { sendNotification, sendReminder } from "../services/notificationService";

/**
 * Instance Generation Job
 * Runs daily to generate recurrence instances for the next 90 days
 * 
 * Schedule: Daily at 2:00 AM
 */
export async function instanceGenerationJob(): Promise<void> {
  console.log("[CalendarJobs] Starting instance generation job...");

  try {
    const count = await InstanceGenerationService.regenerateAllInstances(90);
    console.log(`[CalendarJobs] Generated ${count} instances`);
  } catch (error) {
    console.error("[CalendarJobs] Instance generation job failed:", error);
  }
}

/**
 * Reminder Notification Job
 * Runs every 5 minutes to send pending reminders
 * 
 * Schedule: Every 5 minutes
 */
export async function reminderNotificationJob(): Promise<void> {
  console.log("[CalendarJobs] Starting reminder notification job...");

  try {
    const now = new Date();
    const pendingReminders = await calendarDb.getPendingReminders(now);

    console.log(`[CalendarJobs] Found ${pendingReminders.length} pending reminders`);

    for (const reminder of pendingReminders) {
      try {
        // Send notification based on reminder.method
        const event = await calendarDb.getEventById(reminder.eventId);
        if (!event) {
          console.warn(`[CalendarJobs] Event not found for reminder ${reminder.id}`);
          await calendarDb.updateReminderStatus(reminder.id, "FAILED", "Event not found");
          continue;
        }

        const notificationTitle = `Reminder: ${event.title}`;
        const notificationMessage = `Your event "${event.title}" is starting ${formatReminderTime(reminder.reminderTime, event.startDate)}`;

        if (reminder.method === "IN_APP" || reminder.method === "BOTH") {
          await sendNotification({
            userId: reminder.userId,
            type: "info",
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
              eventId: event.id,
              type: "calendar_reminder",
              startTime: event.startDate.toISOString(),
            },
            category: "appointment",
          });
        }

        if (reminder.method === "EMAIL" || reminder.method === "BOTH") {
          await sendReminder(
            reminder.userId,
            notificationTitle,
            event.id,
            "calendar_event"
          );
        }

        // Mark as sent
        await calendarDb.updateReminderStatus(reminder.id, "SENT");
        console.log(`[CalendarJobs] Sent reminder ${reminder.id}`);
      } catch (error) {
        console.error(`[CalendarJobs] Failed to send reminder ${reminder.id}:`, error);
        await calendarDb.updateReminderStatus(
          reminder.id,
          "FAILED",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    console.log(`[CalendarJobs] Reminder notification job complete`);
  } catch (error) {
    console.error("[CalendarJobs] Reminder notification job failed:", error);
  }
}

/**
 * Format reminder time relative to event start
 */
function formatReminderTime(reminderTime: Date, eventStart: Date): string {
  const diffMs = eventStart.getTime() - reminderTime.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  
  if (diffMins < 60) {
    return `in ${diffMins} minutes`;
  } else if (diffMins < 1440) {
    const hours = Math.round(diffMins / 60);
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.round(diffMins / 1440);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }
}

/**
 * Data Cleanup Job
 * Runs weekly to clean up orphaned records and old data
 * 
 * Schedule: Weekly on Sunday at 3:00 AM
 */
export async function dataCleanupJob(): Promise<void> {
  console.log("[CalendarJobs] Starting data cleanup job...");

  try {
    const results = await DataIntegrityService.runAllCleanup();

    console.log("[CalendarJobs] Data cleanup complete:", {
      orphanedRulesDeleted: results.orphanedRulesDeleted,
      orphanedInstancesDeleted: results.orphanedInstancesDeleted,
      orphanedParticipantsDeleted: results.orphanedParticipantsDeleted,
      orphanedRemindersDeleted: results.orphanedRemindersDeleted,
      orphanedPermissionsDeleted: results.orphanedPermissionsDeleted,
      orphanedAttachmentsDeleted: results.orphanedAttachmentsDeleted,
      softDeletedEventsDeleted: results.softDeletedEventsDeleted,
      oldRemindersDeleted: results.oldRemindersDeleted,
      oldHistoryDeleted: results.oldHistoryDeleted,
    });
  } catch (error) {
    console.error("[CalendarJobs] Data cleanup job failed:", error);
  }
}

/**
 * Old Instance Cleanup Job
 * Runs daily to remove old recurrence instances
 * 
 * Schedule: Daily at 3:00 AM
 */
export async function oldInstanceCleanupJob(): Promise<void> {
  console.log("[CalendarJobs] Starting old instance cleanup job...");

  try {
    const count = await InstanceGenerationService.cleanupOldInstances(30);
    console.log(`[CalendarJobs] Deleted ${count} old instances`);
  } catch (error) {
    console.error("[CalendarJobs] Old instance cleanup job failed:", error);
  }
}

/**
 * Collections Alert Job
 * Runs daily to identify clients needing collections calls
 * 
 * Schedule: Daily at 8:00 AM
 */
export async function collectionsAlertJob(): Promise<void> {
  console.log("[CalendarJobs] Starting collections alert job...");

  try {
    // Import required modules
    const { getDb } = await import("../db");
    const { invoices, clients, calendarEvents } = await import("../../drizzle/schema");
    const { eq, and, lt, sql } = await import("drizzle-orm");
    
    const db = await getDb();
    if (!db) {
      console.error("[CalendarJobs] Database not available");
      return;
    }

    const now = new Date();
    
    // Query for overdue invoices with client info
    const overdueInvoices = await db
      .select({
        invoiceId: invoices.id,
        clientId: invoices.customerId,
        clientName: clients.name,
        amountDue: invoices.amountDue,
        dueDate: invoices.dueDate,
        daysPastDue: sql<number>`DATEDIFF(NOW(), ${invoices.dueDate})`,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.customerId, clients.id))
      .where(
        and(
          lt(invoices.dueDate, now),
          sql`${invoices.status} IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`
        )
      )
      .orderBy(sql`DATEDIFF(NOW(), ${invoices.dueDate}) DESC`);

    console.log(`[CalendarJobs] Found ${overdueInvoices.length} overdue invoices`);

    // Group by client and prioritize
    const clientCollections = new Map<number, {
      clientId: number;
      clientName: string;
      totalOwed: number;
      oldestDueDate: Date;
      invoiceCount: number;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>();

    for (const invoice of overdueInvoices) {
      const existing = clientCollections.get(invoice.clientId);
      const amountDue = Number(invoice.amountDue) || 0;
      
      if (existing) {
        existing.totalOwed += amountDue;
        existing.invoiceCount += 1;
        if (invoice.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = invoice.dueDate;
        }
      } else {
        clientCollections.set(invoice.clientId, {
          clientId: invoice.clientId,
          clientName: invoice.clientName ?? `Client ${invoice.clientId}`,
          totalOwed: amountDue,
          oldestDueDate: invoice.dueDate,
          invoiceCount: 1,
          priority: invoice.daysPastDue > 60 ? "HIGH" : invoice.daysPastDue > 30 ? "MEDIUM" : "LOW",
        });
      }
    }

    // Create calendar events for high-priority collections calls
    const highPriorityClients = Array.from(clientCollections.values())
      .filter(c => c.priority === "HIGH")
      .slice(0, 10); // Limit to top 10

    for (const client of highPriorityClients) {
      // Check if a collections event already exists for this client today
      const existingEvent = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.entityType, "client"),
            eq(calendarEvents.entityId, client.clientId),
            eq(calendarEvents.eventType, "TASK"),
            sql`DATE(${calendarEvents.startDate}) = CURDATE()`,
            sql`${calendarEvents.title} LIKE '%Collections%'`
          )
        )
        .limit(1);

      if (existingEvent.length === 0) {
        // Create collections task event
        const startTime = new Date();
        startTime.setHours(9, 0, 0, 0); // 9 AM today
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        await calendarDb.createEvent({
          title: `Collections Call: ${client.clientName}`,
          description: `Outstanding balance: $${client.totalOwed.toFixed(2)} across ${client.invoiceCount} invoice(s). Oldest due: ${client.oldestDueDate.toLocaleDateString()}`,
          startDate: startTime,
          endDate: endTime,
          module: "ACCOUNTING",
          eventType: "TASK",
          status: "SCHEDULED",
          entityType: "client",
          entityId: client.clientId,
          createdBy: 1, // System user
        });

        console.log(`[CalendarJobs] Created collections event for client ${client.clientId}`);
      }
    }

    // Send notifications to collections team (user ID 1 as admin)
    if (highPriorityClients.length > 0) {
      await sendNotification({
        userId: 1,
        type: "warning",
        title: "Collections Queue Updated",
        message: `${highPriorityClients.length} high-priority clients need collections calls today.`,
        metadata: {
          type: "collections_alert",
          clientCount: highPriorityClients.length,
        },
        category: "system",
      });
    }

    console.log("[CalendarJobs] Collections alert job complete");
  } catch (error) {
    console.error("[CalendarJobs] Collections alert job failed:", error);
  }
}

/**
 * Data Integrity Verification Job
 * Runs daily to check for integrity issues
 * 
 * Schedule: Daily at 4:00 AM
 */
export async function dataIntegrityVerificationJob(): Promise<void> {
  console.log("[CalendarJobs] Starting data integrity verification job...");

  try {
    const report = await DataIntegrityService.verifyIntegrity();

    const hasIssues =
      report.orphanedRules > 0 ||
      report.orphanedInstances > 0 ||
      report.orphanedParticipants > 0 ||
      report.orphanedReminders > 0 ||
      report.orphanedPermissions > 0 ||
      report.orphanedAttachments > 0 ||
      report.invalidEntityLinks > 0;

    if (hasIssues) {
      console.warn("[CalendarJobs] Data integrity issues found:", report);
      // TODO: Send alert to admin
    } else {
      console.log("[CalendarJobs] No data integrity issues found");
    }
  } catch (error) {
    console.error("[CalendarJobs] Data integrity verification job failed:", error);
  }
}

/**
 * Initialize all calendar background jobs
 * Call this from the main server initialization
 * 
 * Note: In production, use a proper job scheduler like:
 * - node-cron for simple scheduling
 * - Bull/BullMQ for Redis-backed job queues
 * - Agenda for MongoDB-backed scheduling
 * 
 * For now, we provide manual execution functions and document the intended schedules.
 */
export function initializeCalendarJobs(): void {
  console.log("[CalendarJobs] Initializing calendar background jobs...");

  // Job schedules (for reference when implementing cron):
  // - instanceGenerationJob: Daily at 2:00 AM ('0 2 * * *')
  // - reminderNotificationJob: Every 5 minutes ('*/5 * * * *')
  // - dataCleanupJob: Weekly on Sunday at 3:00 AM ('0 3 * * 0')
  // - oldInstanceCleanupJob: Daily at 3:00 AM ('0 3 * * *')
  // - collectionsAlertJob: Daily at 8:00 AM ('0 8 * * *')
  // - dataIntegrityVerificationJob: Daily at 4:00 AM ('0 4 * * *')

  // Example implementation with node-cron (uncomment when cron is installed):
  // import cron from 'node-cron';
  // cron.schedule('0 2 * * *', instanceGenerationJob);
  // cron.schedule('*/5 * * * *', reminderNotificationJob);
  // cron.schedule('0 3 * * 0', dataCleanupJob);
  // cron.schedule('0 3 * * *', oldInstanceCleanupJob);
  // cron.schedule('0 8 * * *', collectionsAlertJob);
  // cron.schedule('0 4 * * *', dataIntegrityVerificationJob);

  // For now, jobs can be triggered manually via API or run on server startup
  console.log("[CalendarJobs] Calendar background jobs initialized (manual execution mode)");
  console.log("[CalendarJobs] To enable automatic scheduling, install node-cron and uncomment the schedule lines");
}

/**
 * Run all jobs once (for testing)
 */
export async function runAllJobsOnce(): Promise<void> {
  console.log("[CalendarJobs] Running all jobs once for testing...");

  await instanceGenerationJob();
  await reminderNotificationJob();
  await dataCleanupJob();
  await oldInstanceCleanupJob();
  await collectionsAlertJob();
  await dataIntegrityVerificationJob();

  console.log("[CalendarJobs] All jobs complete");
}

/**
 * Export job functions for manual execution
 */
export const calendarJobs = {
  instanceGeneration: instanceGenerationJob,
  reminderNotification: reminderNotificationJob,
  dataCleanup: dataCleanupJob,
  oldInstanceCleanup: oldInstanceCleanupJob,
  collectionsAlert: collectionsAlertJob,
  dataIntegrityVerification: dataIntegrityVerificationJob,
  initialize: initializeCalendarJobs,
  runAllOnce: runAllJobsOnce,
};

export default calendarJobs;
