import cron from 'node-cron';
import { processNotificationQueue } from '../services/notificationService';
import { logger } from '../_core/logger';

/**
 * Notification Queue Processing Cron Job
 * Runs every minute to process queued notifications and send them to users
 *
 * Schedule: * * * * * (every minute)
 *
 * This cron job:
 * 1. Fetches all queued notifications from the in-memory queue
 * 2. Checks user notification preferences
 * 3. Filters notifications based on user settings
 * 4. Inserts approved notifications into the database
 * 5. Returns processing statistics (processed, skipped, failed)
 *
 * BUG-077 FIX: This cron job ensures that notifications queued by the system
 * are actually processed and delivered to users. Previously, notifications
 * were being queued but never processed, causing the notification system to
 * appear broken.
 */

let taskRef: cron.ScheduledTask | null = null;

export function startNotificationQueueCron() {
  // Run every minute
  taskRef = cron.schedule('* * * * *', async () => {
    const timestamp = new Date().toISOString();

    try {
      const result = await processNotificationQueue();

      // Only log if there was activity
      if (result.processed > 0 || result.failed > 0) {
        logger.info({
          msg: '[NotificationQueueCron] Queue processed',
          timestamp,
          processed: result.processed,
          skipped: result.skipped,
          failed: result.failed,
        });
      }
    } catch (error) {
      logger.error({
        msg: '[NotificationQueueCron] Fatal error processing notification queue',
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  logger.info('[NotificationQueueCron] Notification queue processing started (runs every minute)');
  logger.info('[NotificationQueueCron] Queued notifications will be processed and delivered to users');
}

/**
 * Stop the notification queue processing cron job
 */
export function stopNotificationQueueCron() {
  if (taskRef) {
    taskRef.stop();
    logger.info('[NotificationQueueCron] Notification queue processing stopped');
    taskRef = null;
  }
}
