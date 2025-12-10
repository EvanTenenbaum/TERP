import { getDb } from "./db";
import {
  inventoryAlerts,
  batches,
  sales,
  type InventoryAlert,
  type Batch,
} from "../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Generate inventory alerts
 * Should be run daily via scheduled job
 */
export async function generateInventoryAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all active batches
    const activeBatches = await db
      .select()
      .from(batches)
      .where(sql`${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')`);

    for (const batch of activeBatches) {
      // Check for low stock
      await checkLowStock(batch);

      // Check for expiring batches (if metadata contains expiration date)
      await checkExpiring(batch);

      // Check for overstock
      await checkOverstock(batch);

      // Check for slow-moving inventory
      await checkSlowMoving(batch);
    }
  } catch (error) {
    throw new Error(
      `Failed to generate inventory alerts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check for low stock alert
 */
async function checkLowStock(batch: Batch): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const onHandQty = parseFloat(batch.onHandQty);
  const lowStockThreshold = 10; // Default threshold, could be configurable

  if (onHandQty > 0 && onHandQty <= lowStockThreshold) {
    // Check if alert already exists
    const existing = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "LOW_STOCK"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new alert
      const severity =
        onHandQty <= 5 ? "HIGH" : onHandQty <= 8 ? "MEDIUM" : "LOW";

      await db.insert(inventoryAlerts).values({
        inventoryAlertType: "LOW_STOCK",
        batchId: batch.id,
        threshold: lowStockThreshold.toString(),
        currentValue: onHandQty.toString(),
        alertSeverity: severity,
        message: `Batch ${batch.code} is low on stock (${onHandQty} units remaining)`,
        alertStatus: "ACTIVE",
      });
    }
  } else if (onHandQty > lowStockThreshold) {
    // Resolve existing low stock alert if stock increased
    await db
      .update(inventoryAlerts)
      .set({
        alertStatus: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Stock level increased",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "LOW_STOCK"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      );
  }
}

/**
 * Check for expiring batch alert
 */
async function checkExpiring(batch: Batch): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Parse metadata for expiration date
  if (!batch.metadata) return;

  try {
    const metadata = JSON.parse(batch.metadata);
    if (!metadata.expirationDate) return;

    const expirationDate = new Date(metadata.expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      // Check if alert already exists
      const existing = await db
        .select()
        .from(inventoryAlerts)
        .where(
          and(
            eq(inventoryAlerts.batchId, batch.id),
            eq(inventoryAlerts.inventoryAlertType, "EXPIRING"),
            eq(inventoryAlerts.alertStatus, "ACTIVE")
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const severity =
          daysUntilExpiration <= 7
            ? "HIGH"
            : daysUntilExpiration <= 14
              ? "MEDIUM"
              : "LOW";

        await db.insert(inventoryAlerts).values({
          inventoryAlertType: "EXPIRING",
          batchId: batch.id,
          threshold: "30",
          currentValue: daysUntilExpiration.toString(),
          alertSeverity: severity,
          message: `Batch ${batch.code} expires in ${daysUntilExpiration} days`,
          alertStatus: "ACTIVE",
        });
      }
    } else if (daysUntilExpiration <= 0) {
      // Batch expired, mark as HIGH severity
      await db
        .update(inventoryAlerts)
        .set({
          alertSeverity: "HIGH",
          message: `Batch ${batch.code} has expired`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryAlerts.batchId, batch.id),
            eq(inventoryAlerts.inventoryAlertType, "EXPIRING"),
            eq(inventoryAlerts.alertStatus, "ACTIVE")
          )
        );
    }
  } catch {
    // Metadata parsing error, skip
  }
}

/**
 * Check for overstock alert
 */
async function checkOverstock(batch: Batch): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const onHandQty = parseFloat(batch.onHandQty);
  const overstockThreshold = 100; // Default threshold

  if (onHandQty >= overstockThreshold) {
    const existing = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "OVERSTOCK"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      )
      .limit(1);

    if (existing.length === 0) {
      const severity =
        onHandQty >= 200 ? "HIGH" : onHandQty >= 150 ? "MEDIUM" : "LOW";

      await db.insert(inventoryAlerts).values({
        inventoryAlertType: "OVERSTOCK",
        batchId: batch.id,
        threshold: overstockThreshold.toString(),
        currentValue: onHandQty.toString(),
        alertSeverity: severity,
        message: `Batch ${batch.code} has excess inventory (${onHandQty} units)`,
        alertStatus: "ACTIVE",
      });
    }
  } else if (onHandQty < overstockThreshold) {
    await db
      .update(inventoryAlerts)
      .set({
        alertStatus: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Stock level decreased",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "OVERSTOCK"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      );
  }
}

/**
 * Check for slow-moving inventory alert
 */
async function checkSlowMoving(batch: Batch): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if batch has had any sales in the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentSales = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.batchId, batch.id),
        sql`${sales.saleDate} >= ${ninetyDaysAgo}`
      )
    )
    .limit(1);

  if (recentSales.length === 0 && parseFloat(batch.onHandQty) > 0) {
    const existing = await db
      .select()
      .from(inventoryAlerts)
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "SLOW_MOVING"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(inventoryAlerts).values({
        inventoryAlertType: "SLOW_MOVING",
        batchId: batch.id,
        threshold: "90",
        currentValue: "0",
        alertSeverity: "MEDIUM",
        message: `Batch ${batch.code} has no sales in 90 days`,
        alertStatus: "ACTIVE",
      });
    }
  } else if (recentSales.length > 0) {
    await db
      .update(inventoryAlerts)
      .set({
        alertStatus: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Batch has recent sales",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.inventoryAlertType, "SLOW_MOVING"),
          eq(inventoryAlerts.alertStatus, "ACTIVE")
        )
      );
  }
}

/**
 * Get active inventory alerts
 */
export async function getActiveInventoryAlerts(
  _userId?: number
): Promise<InventoryAlert[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const alerts = await db
      .select()
      .from(inventoryAlerts)
      .where(eq(inventoryAlerts.alertStatus, "ACTIVE"))
      .orderBy(desc(inventoryAlerts.alertSeverity), desc(inventoryAlerts.createdAt));

    return alerts;
  } catch (error) {
    throw new Error(
      `Failed to get active alerts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: number,
  _userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(inventoryAlerts)
      .set({
        alertStatus: "ACKNOWLEDGED",
        acknowledgedBy: _userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryAlerts.id, alertId));
  } catch (error) {
    throw new Error(
      `Failed to acknowledge alert: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: number,
  resolution: string,
  _userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(inventoryAlerts)
      .set({
        alertStatus: "RESOLVED",
        resolvedAt: new Date(),
        resolution,
        updatedAt: new Date(),
      })
      .where(eq(inventoryAlerts.id, alertId));
  } catch (error) {
    throw new Error(
      `Failed to resolve alert: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get alert summary for dashboard widget
 */
export async function getAlertSummary(): Promise<{
  total: number;
  byType: {
    LOW_STOCK: number;
    EXPIRING: number;
    OVERSTOCK: number;
    SLOW_MOVING: number;
  };
  bySeverity: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  highPriority: InventoryAlert[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const alerts = await db
      .select()
      .from(inventoryAlerts)
      .where(eq(inventoryAlerts.alertStatus, "ACTIVE"));

    const summary = {
      total: alerts.length,
      byType: {
        LOW_STOCK: alerts.filter(a => a.inventoryAlertType === "LOW_STOCK").length,
        EXPIRING: alerts.filter(a => a.inventoryAlertType === "EXPIRING").length,
        OVERSTOCK: alerts.filter(a => a.inventoryAlertType === "OVERSTOCK").length,
        SLOW_MOVING: alerts.filter(a => a.inventoryAlertType === "SLOW_MOVING").length,
      },
      bySeverity: {
        HIGH: alerts.filter(a => a.alertSeverity === "HIGH").length,
        MEDIUM: alerts.filter(a => a.alertSeverity === "MEDIUM").length,
        LOW: alerts.filter(a => a.alertSeverity === "LOW").length,
      },
      highPriority: alerts.filter(a => a.alertSeverity === "HIGH"),
    };

    return summary;
  } catch (error) {
    throw new Error(
      `Failed to get alert summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
