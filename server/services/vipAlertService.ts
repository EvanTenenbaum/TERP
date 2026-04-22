/**
 * VIP Alert Service (TER-1231)
 * Detects and manages VIP price alerts when inventory prices drop or come back in stock
 */

import { db } from "../db";
import { eq, and, lte, isNull, sql } from "drizzle-orm";
import {
  clientPriceAlerts,
  batches,
  clients,
  products,
} from "../../drizzle/schema";
import { queueNotification } from "./notificationService";
import { logger } from "../_core/logger";

export interface VipAlertTriggerResult {
  triggeredCount: number;
  alertIds: number[];
}

export interface VipAlertStats {
  activeAlerts: number;
  triggeredToday: number;
}

/**
 * Check for triggered VIP price alerts when a batch price changes
 */
export async function checkVipPriceAlertsForBatch(
  batchId: number
): Promise<VipAlertTriggerResult> {
  try {
    const batch = await db
      .select({
        id: batches.id,
        productId: batches.productId,
        productName: products.nameCanonical,
        sku: batches.sku,
        price: batches.unitCogs,
        batchStatus: batches.batchStatus,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batch.length === 0) {
      logger.warn({ batchId }, "Batch not found for VIP alert check");
      return { triggeredCount: 0, alertIds: [] };
    }

    const batchData = batch[0];
    const currentPrice = parseFloat(batchData.unitCogs || "0");

    const matchingAlerts = await db
      .select({
        id: clientPriceAlerts.id,
        clientId: clientPriceAlerts.clientId,
        batchId: clientPriceAlerts.batchId,
        targetPrice: clientPriceAlerts.targetPrice,
        clientName: clients.name,
      })
      .from(clientPriceAlerts)
      .leftJoin(clients, eq(clientPriceAlerts.clientId, clients.id))
      .where(
        and(
          eq(clientPriceAlerts.batchId, batchId),
          eq(clientPriceAlerts.active, true),
          isNull(clientPriceAlerts.triggeredAt),
          lte(
            sql`CAST(${clientPriceAlerts.targetPrice} as DECIMAL(10,2))`,
            currentPrice
          ),
          sql`${clientPriceAlerts.expiresAt} > NOW()`
        )
      );

    if (matchingAlerts.length === 0) {
      return { triggeredCount: 0, alertIds: [] };
    }

    const triggeredIds: number[] = [];
    const now = new Date();

    for (const alert of matchingAlerts) {
      try {
        await db
          .update(clientPriceAlerts)
          .set({ triggeredAt: now })
          .where(eq(clientPriceAlerts.id, alert.id));

        triggeredIds.push(alert.id);

        const targetPrice = parseFloat(alert.targetPrice);
        await queueNotification({
          clientId: alert.clientId,
          type: "success",
          title: "Price Alert Triggered",
          message: `${batchData.productName || batchData.sku} is now $${currentPrice.toFixed(2)}/unit (target: $${targetPrice.toFixed(2)})`,
          link: `/inventory/${batchId}`,
          channels: ["in_app"],
          category: "system",
          metadata: {
            alertId: alert.id,
            batchId,
            targetPrice,
            currentPrice,
            alertType: "vip_price_alert",
          },
        });

        logger.info(
          { alertId: alert.id, clientId: alert.clientId, batchId },
          "VIP price alert triggered"
        );
      } catch (error) {
        logger.error({ error, alertId: alert.id }, "Failed to trigger VIP alert");
      }
    }

    return { triggeredCount: triggeredIds.length, alertIds: triggeredIds };
  } catch (error) {
    logger.error({ error, batchId }, "Failed to check VIP alerts");
    return { triggeredCount: 0, alertIds: [] };
  }
}

/**
 * Check for stock availability alerts
 */
export async function checkVipStockAlertsForBatch(
  batchId: number
): Promise<VipAlertTriggerResult> {
  try {
    const batch = await db
      .select({
        id: batches.id,
        productName: products.nameCanonical,
        sku: batches.sku,
        price: batches.unitCogs,
        onHandQty: batches.onHandQty,
        batchStatus: batches.batchStatus,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batch.length === 0) {
      return { triggeredCount: 0, alertIds: [] };
    }

    const batchData = batch[0];
    const onHand = parseFloat(batchData.onHandQty || "0");

    if (batchData.batchStatus !== "LIVE" || onHand <= 0) {
      return { triggeredCount: 0, alertIds: [] };
    }

    const stockAlerts = await db
      .select({
        id: clientPriceAlerts.id,
        clientId: clientPriceAlerts.clientId,
        batchId: clientPriceAlerts.batchId,
        targetPrice: clientPriceAlerts.targetPrice,
        clientName: clients.name,
      })
      .from(clientPriceAlerts)
      .leftJoin(clients, eq(clientPriceAlerts.clientId, clients.id))
      .where(
        and(
          eq(clientPriceAlerts.batchId, batchId),
          eq(clientPriceAlerts.active, true),
          isNull(clientPriceAlerts.triggeredAt),
          sql`${clientPriceAlerts.expiresAt} > NOW()`
        )
      );

    if (stockAlerts.length === 0) {
      return { triggeredCount: 0, alertIds: [] };
    }

    const triggeredIds: number[] = [];
    const now = new Date();
    const currentPrice = parseFloat(batchData.unitCogs || "0");

    for (const alert of stockAlerts) {
      try {
        await db
          .update(clientPriceAlerts)
          .set({ triggeredAt: now })
          .where(eq(clientPriceAlerts.id, alert.id));

        triggeredIds.push(alert.id);

        await queueNotification({
          clientId: alert.clientId,
          type: "info",
          title: "Item Back in Stock",
          message: `${batchData.productName || batchData.sku} is now available at $${currentPrice.toFixed(2)}/unit`,
          link: `/inventory/${batchId}`,
          channels: ["in_app"],
          category: "system",
          metadata: {
            alertId: alert.id,
            batchId,
            currentPrice,
            alertType: "vip_stock_alert",
          },
        });

        logger.info({ alertId: alert.id, batchId }, "VIP stock alert triggered");
      } catch (error) {
        logger.error({ error, alertId: alert.id }, "Failed to trigger stock alert");
      }
    }

    return { triggeredCount: triggeredIds.length, alertIds: triggeredIds };
  } catch (error) {
    logger.error({ error, batchId }, "Failed to check VIP stock alerts");
    return { triggeredCount: 0, alertIds: [] };
  }
}

/**
 * Get stats for VIP alerts
 */
export async function getVipAlertStats(): Promise<VipAlertStats> {
  try {
    const activeCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientPriceAlerts)
      .where(
        and(
          eq(clientPriceAlerts.active, true),
          isNull(clientPriceAlerts.triggeredAt),
          sql`${clientPriceAlerts.expiresAt} > NOW()`
        )
      );

    const triggeredToday = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientPriceAlerts)
      .where(
        and(
          sql`${clientPriceAlerts.triggeredAt} >= CURDATE()`,
          sql`${clientPriceAlerts.triggeredAt} < CURDATE() + INTERVAL 1 DAY`
        )
      );

    return {
      activeAlerts: Number(activeCount[0]?.count || 0),
      triggeredToday: Number(triggeredToday[0]?.count || 0),
    };
  } catch (error) {
    logger.error({ error }, "Failed to get VIP alert stats");
    return { activeAlerts: 0, triggeredToday: 0 };
  }
}

/**
 * Get all triggered VIP alerts
 */
export async function getTriggeredVipAlerts(limit = 50) {
  try {
    const alerts = await db
      .select({
        id: clientPriceAlerts.id,
        clientId: clientPriceAlerts.clientId,
        clientName: clients.name,
        batchId: clientPriceAlerts.batchId,
        productName: products.nameCanonical,
        sku: batches.sku,
        targetPrice: clientPriceAlerts.targetPrice,
        currentPrice: batches.unitCogs,
        triggeredAt: clientPriceAlerts.triggeredAt,
      })
      .from(clientPriceAlerts)
      .leftJoin(clients, eq(clientPriceAlerts.clientId, clients.id))
      .leftJoin(batches, eq(clientPriceAlerts.batchId, batches.id))
      .leftJoin(products, eq(batches.productId, products.id))
      .where(
        and(
          eq(clientPriceAlerts.active, true),
          sql`${clientPriceAlerts.triggeredAt} IS NOT NULL`
        )
      )
      .orderBy(sql`${clientPriceAlerts.triggeredAt} DESC`)
      .limit(limit);

    return alerts.map(alert => ({
      id: `VIP_ALERT-${alert.id}`,
      type: "VIP_PRICE_ALERT",
      title: `VIP Alert: ${alert.clientName}`,
      description: `${alert.productName || alert.sku} - Target: $${parseFloat(alert.targetPrice).toFixed(2)}, Current: $${parseFloat(alert.currentPrice || "0").toFixed(2)}`,
      severity: "MEDIUM" as const,
      entityType: "vipAlert",
      entityId: alert.id,
      createdAt: alert.triggeredAt || new Date(),
      metadata: {
        clientId: alert.clientId,
        batchId: alert.batchId,
        targetPrice: parseFloat(alert.targetPrice),
        currentPrice: parseFloat(alert.currentPrice || "0"),
      },
    }));
  } catch (error) {
    logger.error({ error }, "Failed to get triggered VIP alerts");
    return [];
  }
}

/**
 * Dismiss a VIP alert
 */
export async function dismissVipAlert(alertId: number): Promise<boolean> {
  try {
    await db
      .update(clientPriceAlerts)
      .set({ active: false })
      .where(eq(clientPriceAlerts.id, alertId));

    logger.info({ alertId }, "VIP alert dismissed");
    return true;
  } catch (error) {
    logger.error({ error, alertId }, "Failed to dismiss VIP alert");
    return false;
  }
}
