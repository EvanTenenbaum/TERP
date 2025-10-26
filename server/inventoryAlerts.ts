import { getDb } from "./db";
import { 
  inventoryAlerts, 
  batches,
  products,
  sales,
  type InsertInventoryAlert,
  type InventoryAlert
} from "../drizzle/schema";
import { eq, and, sql, lte, desc } from "drizzle-orm";

/**
 * Generate inventory alerts
 * Should be run daily via scheduled job
 */
export async function generateInventoryAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all active batches
    const activeBatches = await db.select()
      .from(batches)
      .where(sql`${batches.status} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')`);

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
  } catch (error: any) {
    throw new Error(`Failed to generate inventory alerts: ${error.message}`);
  }
}

/**
 * Check for low stock alert
 */
async function checkLowStock(batch: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const onHandQty = parseFloat(batch.onHandQty);
  const lowStockThreshold = 10; // Default threshold, could be configurable

  if (onHandQty > 0 && onHandQty <= lowStockThreshold) {
    // Check if alert already exists
    const existing = await db.select()
      .from(inventoryAlerts)
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "LOW_STOCK"),
        eq(inventoryAlerts.status, "ACTIVE")
      ))
      .limit(1);

    if (existing.length === 0) {
      // Create new alert
      const severity = onHandQty <= 5 ? "HIGH" : onHandQty <= 8 ? "MEDIUM" : "LOW";
      
      await db.insert(inventoryAlerts).values({
        alertType: "LOW_STOCK",
        batchId: batch.id,
        threshold: lowStockThreshold.toString(),
        currentValue: onHandQty.toString(),
        severity,
        message: `Batch ${batch.code} is low on stock (${onHandQty} units remaining)`,
        status: "ACTIVE"
      });
    }
  } else if (onHandQty > lowStockThreshold) {
    // Resolve existing low stock alert if stock increased
    await db.update(inventoryAlerts)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Stock level increased",
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "LOW_STOCK"),
        eq(inventoryAlerts.status, "ACTIVE")
      ));
  }
}

/**
 * Check for expiring batch alert
 */
async function checkExpiring(batch: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Parse metadata for expiration date
  if (!batch.metadata) return;

  try {
    const metadata = JSON.parse(batch.metadata);
    if (!metadata.expirationDate) return;

    const expirationDate = new Date(metadata.expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      // Check if alert already exists
      const existing = await db.select()
        .from(inventoryAlerts)
        .where(and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.alertType, "EXPIRING"),
          eq(inventoryAlerts.status, "ACTIVE")
        ))
        .limit(1);

      if (existing.length === 0) {
        const severity = daysUntilExpiration <= 7 ? "HIGH" : daysUntilExpiration <= 14 ? "MEDIUM" : "LOW";
        
        await db.insert(inventoryAlerts).values({
          alertType: "EXPIRING",
          batchId: batch.id,
          threshold: "30",
          currentValue: daysUntilExpiration.toString(),
          severity,
          message: `Batch ${batch.code} expires in ${daysUntilExpiration} days`,
          status: "ACTIVE"
        });
      }
    } else if (daysUntilExpiration <= 0) {
      // Batch expired, mark as HIGH severity
      await db.update(inventoryAlerts)
        .set({
          severity: "HIGH",
          message: `Batch ${batch.code} has expired`,
          updatedAt: new Date()
        })
        .where(and(
          eq(inventoryAlerts.batchId, batch.id),
          eq(inventoryAlerts.alertType, "EXPIRING"),
          eq(inventoryAlerts.status, "ACTIVE")
        ));
    }
  } catch (error) {
    // Metadata parsing error, skip
  }
}

/**
 * Check for overstock alert
 */
async function checkOverstock(batch: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const onHandQty = parseFloat(batch.onHandQty);
  const overstockThreshold = 100; // Default threshold

  if (onHandQty >= overstockThreshold) {
    const existing = await db.select()
      .from(inventoryAlerts)
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "OVERSTOCK"),
        eq(inventoryAlerts.status, "ACTIVE")
      ))
      .limit(1);

    if (existing.length === 0) {
      const severity = onHandQty >= 200 ? "HIGH" : onHandQty >= 150 ? "MEDIUM" : "LOW";
      
      await db.insert(inventoryAlerts).values({
        alertType: "OVERSTOCK",
        batchId: batch.id,
        threshold: overstockThreshold.toString(),
        currentValue: onHandQty.toString(),
        severity,
        message: `Batch ${batch.code} has excess inventory (${onHandQty} units)`,
        status: "ACTIVE"
      });
    }
  } else if (onHandQty < overstockThreshold) {
    await db.update(inventoryAlerts)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Stock level decreased",
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "OVERSTOCK"),
        eq(inventoryAlerts.status, "ACTIVE")
      ));
  }
}

/**
 * Check for slow-moving inventory alert
 */
async function checkSlowMoving(batch: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if batch has had any sales in the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentSales = await db.select()
    .from(sales)
    .where(and(
      eq(sales.batchId, batch.id),
      sql`${sales.saleDate} >= ${ninetyDaysAgo}`
    ))
    .limit(1);

  if (recentSales.length === 0 && parseFloat(batch.onHandQty) > 0) {
    const existing = await db.select()
      .from(inventoryAlerts)
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "SLOW_MOVING"),
        eq(inventoryAlerts.status, "ACTIVE")
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(inventoryAlerts).values({
        alertType: "SLOW_MOVING",
        batchId: batch.id,
        threshold: "90",
        currentValue: "0",
        severity: "MEDIUM",
        message: `Batch ${batch.code} has no sales in 90 days`,
        status: "ACTIVE"
      });
    }
  } else if (recentSales.length > 0) {
    await db.update(inventoryAlerts)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolution: "Batch has recent sales",
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryAlerts.batchId, batch.id),
        eq(inventoryAlerts.alertType, "SLOW_MOVING"),
        eq(inventoryAlerts.status, "ACTIVE")
      ));
  }
}

/**
 * Get active inventory alerts
 */
export async function getActiveInventoryAlerts(userId?: number): Promise<InventoryAlert[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const alerts = await db.select()
      .from(inventoryAlerts)
      .where(eq(inventoryAlerts.status, "ACTIVE"))
      .orderBy(desc(inventoryAlerts.severity), desc(inventoryAlerts.createdAt));

    return alerts;
  } catch (error: any) {
    throw new Error(`Failed to get active alerts: ${error.message}`);
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(inventoryAlerts)
      .set({
        status: "ACKNOWLEDGED",
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(inventoryAlerts.id, alertId));
  } catch (error: any) {
    throw new Error(`Failed to acknowledge alert: ${error.message}`);
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: number,
  resolution: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(inventoryAlerts)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolution,
        updatedAt: new Date()
      })
      .where(eq(inventoryAlerts.id, alertId));
  } catch (error: any) {
    throw new Error(`Failed to resolve alert: ${error.message}`);
  }
}

/**
 * Get alert summary for dashboard widget
 */
export async function getAlertSummary(): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const alerts = await db.select()
      .from(inventoryAlerts)
      .where(eq(inventoryAlerts.status, "ACTIVE"));

    const summary = {
      total: alerts.length,
      byType: {
        LOW_STOCK: alerts.filter(a => a.alertType === "LOW_STOCK").length,
        EXPIRING: alerts.filter(a => a.alertType === "EXPIRING").length,
        OVERSTOCK: alerts.filter(a => a.alertType === "OVERSTOCK").length,
        SLOW_MOVING: alerts.filter(a => a.alertType === "SLOW_MOVING").length
      },
      bySeverity: {
        HIGH: alerts.filter(a => a.severity === "HIGH").length,
        MEDIUM: alerts.filter(a => a.severity === "MEDIUM").length,
        LOW: alerts.filter(a => a.severity === "LOW").length
      },
      highPriority: alerts.filter(a => a.severity === "HIGH")
    };

    return summary;
  } catch (error: any) {
    throw new Error(`Failed to get alert summary: ${error.message}`);
  }
}

