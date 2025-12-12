import cron from 'node-cron';
import { runPriceAlertCheck } from '../services/priceAlertsService';

/**
 * Price Alerts Cron Job
 * Runs every hour to check for triggered price alerts and send notifications
 * 
 * Schedule: 0 * * * * (every hour at minute 0)
 * 
 * This cron job:
 * 1. Fetches all active price alerts
 * 2. Compares current prices with target prices
 * 3. Identifies triggered alerts (current price <= target price)
 * 4. Sends email notifications to clients
 * 5. Deactivates triggered alerts
 */

export function startPriceAlertsCron() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[Cron] [${timestamp}] Running price alerts check...`);
    
    try {
      const result = await runPriceAlertCheck();
      
      console.log(`[Cron] [${timestamp}] Price alerts check complete:`);
      console.log(`  - Alerts checked: ${result.checked}`);
      console.log(`  - Alerts triggered: ${result.triggered}`);
    } catch (error) {
      console.error(`[Cron] [${timestamp}] Fatal error running price alerts check:`, error);
    }
  });
  
  console.log('[Cron] Price alerts cron job started (runs hourly at minute 0)');
  console.log('[Cron] Next run will be at the top of the next hour');
}

/**
 * Stop the price alerts cron job
 * (Currently not implemented as node-cron doesn't provide a stop method for individual jobs)
 */
export function stopPriceAlertsCron() {
  console.log('[Cron] Price alerts cron job stop requested');
  // Note: To stop the cron, you would need to keep a reference to the scheduled task
  // and call task.stop() on it. For now, this is a placeholder.
}
