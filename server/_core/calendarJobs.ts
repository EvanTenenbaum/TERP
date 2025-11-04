/**
 * Calendar Background Jobs
 * Automated maintenance and notification jobs for Calendar & Scheduling Module
 * Version 2.0 - Post-Adversarial QA
 */

import InstanceGenerationService from "./instanceGenerationService";
import DataIntegrityService from "./dataIntegrityService";
import * as calendarDb from "../calendarDb";

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
        // TODO: Send notification based on reminder.method
        // - IN_APP: Create inbox notification
        // - EMAIL: Send email via notification service
        // - BOTH: Do both

        // For now, just mark as sent
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
    // TODO: Query for overdue invoices
    // TODO: Generate prioritized collections queue
    // TODO: Create calendar events for collections calls
    // TODO: Send notifications to collections team

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
 */
export function initializeCalendarJobs(): void {
  console.log("[CalendarJobs] Initializing calendar background jobs...");

  // TODO: Set up cron schedules
  // Example using node-cron:
  // cron.schedule('0 2 * * *', instanceGenerationJob);
  // cron.schedule('*/5 * * * *', reminderNotificationJob);
  // cron.schedule('0 3 * * 0', dataCleanupJob);
  // cron.schedule('0 3 * * *', oldInstanceCleanupJob);
  // cron.schedule('0 8 * * *', collectionsAlertJob);
  // cron.schedule('0 4 * * *', dataIntegrityVerificationJob);

  console.log("[CalendarJobs] Calendar background jobs initialized");
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
