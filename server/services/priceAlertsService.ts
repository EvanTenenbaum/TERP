/**
 * Price Alerts Service
 * 
 * Handles price monitoring and alert notifications for VIP Portal Live Catalog.
 * Clients can set target prices for batches and receive notifications when prices drop.
 */

import { getDb } from '../db';
import { batches, products, clientPriceAlerts, clients } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { calculateRetailPrice, getClientPricingRules, InventoryItem } from '../pricingEngine';

export interface PriceAlert {
  id: number;
  clientId: number;
  batchId: number;
  targetPrice: number;
  isActive: boolean;
  currentPrice: number | null;
  productName: string;
  category: string | null;
  priceDropPercentage: number | null;
  createdAt: Date;
}

export interface PriceAlertNotification {
  alertId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  batchId: number;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  priceDropAmount: number;
  priceDropPercentage: number;
}

/**
 * Create a new price alert
 */
export async function createPriceAlert(
  clientId: number,
  batchId: number,
  targetPrice: number
): Promise<{ success: boolean; alertId?: number; message?: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Check if batch exists
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
    });

    if (!batch) {
      return { success: false, message: 'Batch not found' };
    }

    // Check if alert already exists for this client/batch
    const existingAlert = await db.query.clientPriceAlerts.findFirst({
      where: and(
        eq(clientPriceAlerts.clientId, clientId),
        eq(clientPriceAlerts.batchId, batchId),
        eq(clientPriceAlerts.active, true)
      ),
    });

    if (existingAlert) {
      // Update existing alert - use string for decimal column
      await db
        .update(clientPriceAlerts)
        .set({
          targetPrice: String(targetPrice),
        })
        .where(eq(clientPriceAlerts.id, existingAlert.id));

      return {
        success: true,
        alertId: existingAlert.id,
        message: 'Price alert updated',
      };
    }

    // Create new alert - calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await db
      .insert(clientPriceAlerts)
      .values({
        clientId,
        batchId,
        targetPrice: String(targetPrice),
        active: true,
        expiresAt,
      });

    // Extract insertId from MySQL result
    const insertId = Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId : 0;

    return {
      success: true,
      alertId: insertId,
      message: 'Price alert created',
    };
  } catch (error) {
    console.error('[PriceAlerts] Error creating price alert:', error);
    return { success: false, message: 'Failed to create price alert' };
  }
}

/**
 * Get all active price alerts for a client
 */
export async function getClientPriceAlerts(clientId: number): Promise<PriceAlert[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const alerts = await db
      .select({
        id: clientPriceAlerts.id,
        clientId: clientPriceAlerts.clientId,
        batchId: clientPriceAlerts.batchId,
        targetPrice: clientPriceAlerts.targetPrice,
        isActive: clientPriceAlerts.active,
        createdAt: clientPriceAlerts.createdAt,
        productName: products.nameCanonical,
        category: products.category,
        unitCogs: batches.unitCogs,
      })
      .from(clientPriceAlerts)
      .innerJoin(batches, eq(clientPriceAlerts.batchId, batches.id))
      .leftJoin(products, eq(batches.productId, products.id))
      .where(
        and(
          eq(clientPriceAlerts.clientId, clientId),
          eq(clientPriceAlerts.active, true)
        )
      )
      .orderBy(clientPriceAlerts.createdAt);

    // Get client pricing rules once
    const pricingRules = await getClientPricingRules(clientId);

    // Calculate current prices and price drop percentages
    const alertsWithPrices = await Promise.all(
      alerts.map(async (alert) => {
        // Build inventory item for pricing calculation
        const basePrice = parseFloat(alert.unitCogs || '0');
        const item: InventoryItem = {
          id: alert.batchId,
          name: alert.productName || 'Unknown Product',
          category: alert.category || undefined,
          basePrice,
        };

        // Get personalized price for this client
        const pricedItem = await calculateRetailPrice(item, pricingRules);
        const currentPrice = pricedItem.retailPrice;

        const targetPriceNum = parseFloat(alert.targetPrice);
        const priceDropPercentage =
          currentPrice > 0
            ? ((targetPriceNum - currentPrice) / currentPrice) * 100
            : null;

        return {
          id: alert.id,
          clientId: alert.clientId,
          batchId: alert.batchId,
          targetPrice: targetPriceNum,
          isActive: alert.isActive,
          currentPrice,
          productName: alert.productName || 'Unknown Product',
          category: alert.category,
          priceDropPercentage,
          createdAt: alert.createdAt,
        };
      })
    );

    return alertsWithPrices;
  } catch (error) {
    console.error('[PriceAlerts] Error getting client price alerts:', error);
    return [];
  }
}

/**
 * Deactivate a price alert
 */
export async function deactivatePriceAlert(
  alertId: number,
  clientId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db
      .update(clientPriceAlerts)
      .set({
        active: false,
      })
      .where(
        and(
          eq(clientPriceAlerts.id, alertId),
          eq(clientPriceAlerts.clientId, clientId)
        )
      );

    return { success: true, message: 'Price alert deactivated' };
  } catch (error) {
    console.error('[PriceAlerts] Error deactivating price alert:', error);
    return { success: false, message: 'Failed to deactivate price alert' };
  }
}

/**
 * Check all active price alerts and return those that have been triggered
 * (current price is at or below target price)
 */
export async function checkPriceAlerts(): Promise<PriceAlertNotification[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get all active price alerts
    const alerts = await db
      .select({
        id: clientPriceAlerts.id,
        clientId: clientPriceAlerts.clientId,
        batchId: clientPriceAlerts.batchId,
        targetPrice: clientPriceAlerts.targetPrice,
        clientName: clients.name,
        clientEmail: clients.email,
        productName: products.nameCanonical,
        unitCogs: batches.unitCogs,
      })
      .from(clientPriceAlerts)
      .innerJoin(clients, eq(clientPriceAlerts.clientId, clients.id))
      .innerJoin(batches, eq(clientPriceAlerts.batchId, batches.id))
      .leftJoin(products, eq(batches.productId, products.id))
      .where(eq(clientPriceAlerts.active, true));

    const triggeredAlerts: PriceAlertNotification[] = [];

    for (const alert of alerts) {
      // Get client pricing rules
      const pricingRules = await getClientPricingRules(alert.clientId);

      // Build inventory item for pricing calculation
      const basePrice = parseFloat(alert.unitCogs || '0');
      const item: InventoryItem = {
        id: alert.batchId,
        name: alert.productName || 'Unknown Product',
        category: undefined,
        basePrice,
      };

      // Calculate current personalized price
      const pricedItem = await calculateRetailPrice(item, pricingRules);
      const currentPrice = pricedItem.retailPrice;

      const targetPriceNum = parseFloat(alert.targetPrice);

      // Check if price has dropped to or below target
      if (currentPrice <= targetPriceNum) {
        const priceDropAmount = targetPriceNum - currentPrice;
        const priceDropPercentage = targetPriceNum > 0 
          ? (priceDropAmount / targetPriceNum) * 100 
          : 0;

        triggeredAlerts.push({
          alertId: alert.id,
          clientId: alert.clientId,
          clientName: alert.clientName,
          clientEmail: alert.clientEmail || '',
          batchId: alert.batchId,
          productName: alert.productName || 'Unknown Product',
          targetPrice: targetPriceNum,
          currentPrice,
          priceDropAmount,
          priceDropPercentage,
        });
      }
    }

    return triggeredAlerts;
  } catch (error) {
    console.error('[PriceAlerts] Error checking price alerts:', error);
    return [];
  }
}

/**
 * Send price alert notifications
 * This would integrate with your email/notification system
 */
export async function sendPriceAlertNotifications(
  notifications: PriceAlertNotification[]
): Promise<void> {
  for (const notification of notifications) {
    try {
      // TODO: Integrate with email service
      console.log('[PriceAlerts] Sending notification:', {
        to: notification.clientEmail,
        subject: `Price Alert: ${notification.productName}`,
        message: `The price for ${notification.productName} has dropped to ${notification.currentPrice.toFixed(2)} (your target: ${notification.targetPrice.toFixed(2)})`,
      });

      // Deactivate the alert after notification is sent
      await deactivatePriceAlert(notification.alertId, notification.clientId);
    } catch (error) {
      console.error('[PriceAlerts] Error sending notification:', error);
    }
  }
}

/**
 * Run price alert check (to be called by a cron job or scheduled task)
 */
export async function runPriceAlertCheck(): Promise<{
  checked: number;
  triggered: number;
}> {
  try {
    console.log('[PriceAlerts] Running price alert check...');

    const triggeredAlerts = await checkPriceAlerts();

    if (triggeredAlerts.length > 0) {
      console.log(`[PriceAlerts] Found ${triggeredAlerts.length} triggered alerts`);
      await sendPriceAlertNotifications(triggeredAlerts);
    } else {
      console.log('[PriceAlerts] No triggered alerts found');
    }

    return {
      checked: triggeredAlerts.length,
      triggered: triggeredAlerts.length,
    };
  } catch (error) {
    console.error('[PriceAlerts] Error running price alert check:', error);
    return { checked: 0, triggered: 0 };
  }
}
