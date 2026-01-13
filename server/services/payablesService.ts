/**
 * Payables Service (MEET-005, MEET-006)
 *
 * Core business logic for vendor payables tracking.
 * Handles:
 * - Creating payables for consigned inventory
 * - Marking payables as "DUE" when inventory hits zero
 * - Calculating amounts owed based on COGS and quantity sold
 * - Triggering notifications to accounting role
 *
 * Business rules:
 * - Only applies to consignment inventory (not office-owned or sample)
 * - Payable amount = Units sold x COGS per unit
 * - Grace period of 24h before notification (configurable)
 */

import { eq, and, sql, isNull, desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  vendorPayables,
  payableNotifications,
  batches,
  lots,
  clients,
  users,
  InsertVendorPayable,
  InsertPayableNotification,
  VendorPayable,
} from "../../drizzle/schema";
import { logger } from "../_core/logger";
import { sendNotification, sendBulkNotification } from "./notificationService";

// ============================================================================
// Types
// ============================================================================

export type PayableStatus = "PENDING" | "DUE" | "PARTIAL" | "PAID" | "VOID";
export type OwnershipType = "CONSIGNED" | "OFFICE_OWNED" | "SAMPLE";

interface CreatePayableInput {
  batchId: number;
  lotId: number;
  vendorClientId: number;
  cogsPerUnit: number;
  createdBy: number;
  gracePeriodHours?: number;
}

interface PayableWithDetails extends VendorPayable {
  vendorName: string;
  batchCode: string;
  batchSku: string;
  lotCode: string;
}

// ============================================================================
// Payable Number Generation
// ============================================================================

/**
 * Generate a unique payable number
 */
async function generatePayableNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vendorPayables)
    .where(sql`YEAR(created_at) = ${year} AND MONTH(created_at) = ${today.getMonth() + 1}`);

  const count = Number(result[0]?.count || 0) + 1;
  return `PAY-${year}${month}-${String(count).padStart(5, "0")}`;
}

// ============================================================================
// Payable CRUD Operations
// ============================================================================

/**
 * Create a payable for a consigned batch
 * Called when a consigned batch is created or updated to track vendor obligation
 */
export async function createPayable(input: CreatePayableInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  logger.info({
    msg: "[Payables] Creating payable",
    batchId: input.batchId,
    vendorClientId: input.vendorClientId,
  });

  // Check if payable already exists for this batch
  const [existing] = await db
    .select()
    .from(vendorPayables)
    .where(
      and(
        eq(vendorPayables.batchId, input.batchId),
        isNull(vendorPayables.deletedAt)
      )
    );

  if (existing) {
    logger.info({ msg: "[Payables] Payable already exists", payableId: existing.id });
    return existing.id;
  }

  const payableNumber = await generatePayableNumber();

  const [result] = await db
    .insert(vendorPayables)
    .values({
      vendorClientId: input.vendorClientId,
      batchId: input.batchId,
      lotId: input.lotId,
      payableNumber,
      unitsSold: "0",
      cogsPerUnit: input.cogsPerUnit.toFixed(2),
      totalAmount: "0",
      amountPaid: "0",
      amountDue: "0",
      status: "PENDING",
      gracePeriodHours: input.gracePeriodHours ?? 24,
      createdBy: input.createdBy,
    })
    .$returningId();

  logger.info({
    msg: "[Payables] Payable created",
    payableId: result.id,
    payableNumber,
  });

  return result.id;
}

/**
 * Get payable by ID with details
 */
export async function getPayableById(payableId: number): Promise<PayableWithDetails | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .select({
      payable: vendorPayables,
      vendorName: clients.name,
      batchCode: batches.code,
      batchSku: batches.sku,
      lotCode: lots.code,
    })
    .from(vendorPayables)
    .leftJoin(clients, eq(vendorPayables.vendorClientId, clients.id))
    .leftJoin(batches, eq(vendorPayables.batchId, batches.id))
    .leftJoin(lots, eq(vendorPayables.lotId, lots.id))
    .where(and(eq(vendorPayables.id, payableId), isNull(vendorPayables.deletedAt)));

  if (!result) return null;

  return {
    ...result.payable,
    vendorName: result.vendorName || "Unknown Vendor",
    batchCode: result.batchCode || "Unknown",
    batchSku: result.batchSku || "Unknown",
    lotCode: result.lotCode || "Unknown",
  };
}

/**
 * Get payable by batch ID
 */
export async function getPayableByBatchId(batchId: number): Promise<VendorPayable | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db
    .select()
    .from(vendorPayables)
    .where(and(eq(vendorPayables.batchId, batchId), isNull(vendorPayables.deletedAt)));

  return result || null;
}

/**
 * List payables with optional filters
 */
export async function listPayables(filters?: {
  vendorClientId?: number;
  status?: PayableStatus | PayableStatus[];
  limit?: number;
  offset?: number;
}): Promise<{ items: PayableWithDetails[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [isNull(vendorPayables.deletedAt)];

  if (filters?.vendorClientId) {
    conditions.push(eq(vendorPayables.vendorClientId, filters.vendorClientId));
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(inArray(vendorPayables.status, filters.status));
    } else {
      conditions.push(eq(vendorPayables.status, filters.status));
    }
  }

  const results = await db
    .select({
      payable: vendorPayables,
      vendorName: clients.name,
      batchCode: batches.code,
      batchSku: batches.sku,
      lotCode: lots.code,
    })
    .from(vendorPayables)
    .leftJoin(clients, eq(vendorPayables.vendorClientId, clients.id))
    .leftJoin(batches, eq(vendorPayables.batchId, batches.id))
    .leftJoin(lots, eq(vendorPayables.lotId, lots.id))
    .where(and(...conditions))
    .orderBy(desc(vendorPayables.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vendorPayables)
    .where(and(...conditions));

  const items = results.map(r => ({
    ...r.payable,
    vendorName: r.vendorName || "Unknown Vendor",
    batchCode: r.batchCode || "Unknown",
    batchSku: r.batchSku || "Unknown",
    lotCode: r.lotCode || "Unknown",
  }));

  return { items, total: Number(countResult?.count || 0) };
}

// ============================================================================
// Payable Status Updates
// ============================================================================

/**
 * Update payable when inventory is sold
 * Called whenever inventory is deducted from a batch
 */
export async function updatePayableOnSale(
  batchId: number,
  quantitySold: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get batch to check ownership type
  const [batch] = await db
    .select({
      ownershipType: batches.ownershipType,
      onHandQty: batches.onHandQty,
      unitCogs: batches.unitCogs,
    })
    .from(batches)
    .where(eq(batches.id, batchId));

  if (!batch) {
    logger.warn({ msg: "[Payables] Batch not found for sale update", batchId });
    return;
  }

  // MEET-006: Only update payables for consigned inventory
  if (batch.ownershipType !== "CONSIGNED") {
    logger.info({
      msg: "[Payables] Skipping payable update for non-consigned inventory",
      batchId,
      ownershipType: batch.ownershipType,
    });
    return;
  }

  // Get payable for this batch
  const payable = await getPayableByBatchId(batchId);
  if (!payable) {
    logger.warn({ msg: "[Payables] No payable found for batch", batchId });
    return;
  }

  // Calculate new amounts
  const currentUnitsSold = parseFloat(payable.unitsSold || "0");
  const cogsPerUnit = parseFloat(payable.cogsPerUnit || "0");
  const newUnitsSold = currentUnitsSold + quantitySold;
  const newTotalAmount = newUnitsSold * cogsPerUnit;
  const currentAmountPaid = parseFloat(payable.amountPaid || "0");
  const newAmountDue = newTotalAmount - currentAmountPaid;

  await db
    .update(vendorPayables)
    .set({
      unitsSold: newUnitsSold.toFixed(2),
      totalAmount: newTotalAmount.toFixed(2),
      amountDue: newAmountDue.toFixed(2),
    })
    .where(eq(vendorPayables.id, payable.id));

  logger.info({
    msg: "[Payables] Updated payable on sale",
    payableId: payable.id,
    quantitySold,
    newUnitsSold,
    newTotalAmount,
  });
}

/**
 * Mark payable as "DUE" when batch inventory hits zero
 * Triggers notification to accounting after grace period
 */
export async function markPayableDue(batchId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  logger.info({ msg: "[Payables] Checking if payable should be marked due", batchId });

  // Get batch to verify inventory is zero
  const [batch] = await db
    .select({
      onHandQty: batches.onHandQty,
      ownershipType: batches.ownershipType,
      code: batches.code,
      sku: batches.sku,
    })
    .from(batches)
    .where(eq(batches.id, batchId));

  if (!batch) {
    logger.warn({ msg: "[Payables] Batch not found", batchId });
    return;
  }

  // Only check consigned inventory
  if (batch.ownershipType !== "CONSIGNED") {
    return;
  }

  const onHandQty = parseFloat(batch.onHandQty || "0");
  if (onHandQty > 0) {
    logger.info({
      msg: "[Payables] Batch still has inventory, not marking due",
      batchId,
      onHandQty,
    });
    return;
  }

  // Get payable for this batch
  const payable = await getPayableByBatchId(batchId);
  if (!payable) {
    logger.warn({ msg: "[Payables] No payable found for batch", batchId });
    return;
  }

  // Only mark as DUE if currently PENDING
  if (payable.status !== "PENDING") {
    logger.info({
      msg: "[Payables] Payable already processed",
      payableId: payable.id,
      status: payable.status,
    });
    return;
  }

  const now = new Date();
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + payable.gracePeriodHours);

  await db
    .update(vendorPayables)
    .set({
      status: "DUE",
      inventoryZeroAt: now,
      dueDate: dueDate.toISOString().split("T")[0],
    })
    .where(eq(vendorPayables.id, payable.id));

  logger.info({
    msg: "[Payables] Marked payable as DUE",
    payableId: payable.id,
    dueDate,
  });

  // Schedule notification after grace period
  await schedulePayableNotification(payable.id, batch.sku);
}

/**
 * Check inventory zero threshold and mark payable due if needed
 * This should be called after any inventory quantity change
 */
export async function checkInventoryZeroThreshold(batchId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [batch] = await db
    .select({
      onHandQty: batches.onHandQty,
      ownershipType: batches.ownershipType,
    })
    .from(batches)
    .where(eq(batches.id, batchId));

  if (!batch || batch.ownershipType !== "CONSIGNED") {
    return;
  }

  const onHandQty = parseFloat(batch.onHandQty || "0");
  if (onHandQty <= 0) {
    await markPayableDue(batchId);
  }
}

// ============================================================================
// Payment Recording
// ============================================================================

/**
 * Record a payment against a payable
 */
export async function recordPayablePayment(
  payableId: number,
  amount: number,
  userId: number,
  notes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const payable = await getPayableById(payableId);
  if (!payable) {
    throw new Error("Payable not found");
  }

  const currentAmountPaid = parseFloat(payable.amountPaid || "0");
  const totalAmount = parseFloat(payable.totalAmount || "0");
  const newAmountPaid = currentAmountPaid + amount;
  const newAmountDue = Math.max(0, totalAmount - newAmountPaid);

  // Determine new status
  let newStatus: PayableStatus;
  if (newAmountDue <= 0.01) {
    newStatus = "PAID";
  } else if (newAmountPaid > 0) {
    newStatus = "PARTIAL";
  } else {
    newStatus = payable.status as PayableStatus;
  }

  const updateData: Partial<InsertVendorPayable> = {
    amountPaid: newAmountPaid.toFixed(2),
    amountDue: newAmountDue.toFixed(2),
    status: newStatus,
  };

  if (newStatus === "PAID") {
    updateData.paidDate = new Date().toISOString().split("T")[0] as unknown as string;
  }

  if (notes) {
    updateData.notes = `${payable.notes || ""}\n[Payment ${new Date().toISOString()}]: ${notes}`.trim();
  }

  await db.update(vendorPayables).set(updateData).where(eq(vendorPayables.id, payableId));

  logger.info({
    msg: "[Payables] Payment recorded",
    payableId,
    amount,
    newAmountPaid,
    newAmountDue,
    newStatus,
  });
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Schedule notification to accounting for payable due
 * Will be sent after grace period expires
 */
async function schedulePayableNotification(payableId: number, batchSku: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get users with accounting role
  const accountingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin")); // For now, notify admins. Can be refined to accounting role

  if (accountingUsers.length === 0) {
    logger.warn({ msg: "[Payables] No accounting users found for notification" });
    return;
  }

  const payable = await getPayableById(payableId);
  if (!payable) return;

  const amountDue = parseFloat(payable.amountDue || "0");
  const subject = `Payable Due: ${payable.payableNumber} for ${batchSku}`;
  const message = `A payable of $${amountDue.toFixed(2)} is now due to ${payable.vendorName} for batch ${batchSku}. The inventory has been fully sold.`;

  // Create notification record
  await db.insert(payableNotifications).values({
    payableId,
    notificationType: "PAYABLE_DUE",
    sentToRole: "accounting",
    subject,
    message,
  });

  // Send in-app notification to accounting users
  await sendBulkNotification(
    accountingUsers.map(u => u.id),
    {
      type: "info",
      title: subject,
      message,
      link: `/accounting/payables/${payableId}`,
      category: "order",
    }
  );

  // Update payable with notification timestamp
  await db
    .update(vendorPayables)
    .set({ notificationSentAt: new Date() })
    .where(eq(vendorPayables.id, payableId));

  logger.info({
    msg: "[Payables] Notification sent to accounting",
    payableId,
    userCount: accountingUsers.length,
  });
}

/**
 * Send overdue notifications for past-due payables
 * Should be called by a cron job
 */
export async function sendOverdueNotifications(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date().toISOString().split("T")[0];

  // Find due payables that are past due date
  const overduePayables = await db
    .select()
    .from(vendorPayables)
    .where(
      and(
        eq(vendorPayables.status, "DUE"),
        sql`${vendorPayables.dueDate} < ${today}`,
        isNull(vendorPayables.deletedAt)
      )
    );

  let notificationCount = 0;

  for (const payable of overduePayables) {
    const payableWithDetails = await getPayableById(payable.id);
    if (!payableWithDetails) continue;

    const amountDue = parseFloat(payableWithDetails.amountDue || "0");
    const subject = `OVERDUE: Payable ${payableWithDetails.payableNumber}`;
    const message = `A payable of $${amountDue.toFixed(2)} to ${payableWithDetails.vendorName} is now overdue. Due date was ${payable.dueDate}.`;

    // Create notification record
    await db.insert(payableNotifications).values({
      payableId: payable.id,
      notificationType: "OVERDUE",
      sentToRole: "accounting",
      subject,
      message,
    });

    // Get accounting users
    const accountingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    if (accountingUsers.length > 0) {
      await sendBulkNotification(
        accountingUsers.map(u => u.id),
        {
          type: "warning",
          title: subject,
          message,
          link: `/accounting/payables/${payable.id}`,
          category: "order",
        }
      );
      notificationCount++;
    }
  }

  return notificationCount;
}

// ============================================================================
// Dashboard/Summary Functions
// ============================================================================

/**
 * Get payables summary statistics
 */
export async function getPayablesSummary(): Promise<{
  totalPending: number;
  totalDue: number;
  totalPartial: number;
  totalPaid: number;
  pendingAmount: number;
  dueAmount: number;
  partialAmount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalPending: 0,
      totalDue: 0,
      totalPartial: 0,
      totalPaid: 0,
      pendingAmount: 0,
      dueAmount: 0,
      partialAmount: 0,
    };
  }

  const result = await db
    .select({
      status: vendorPayables.status,
      count: sql<number>`COUNT(*)`,
      totalAmountDue: sql<string>`SUM(${vendorPayables.amountDue})`,
    })
    .from(vendorPayables)
    .where(isNull(vendorPayables.deletedAt))
    .groupBy(vendorPayables.status);

  const summary = {
    totalPending: 0,
    totalDue: 0,
    totalPartial: 0,
    totalPaid: 0,
    pendingAmount: 0,
    dueAmount: 0,
    partialAmount: 0,
  };

  for (const row of result) {
    const count = Number(row.count);
    const amount = parseFloat(row.totalAmountDue || "0");

    switch (row.status) {
      case "PENDING":
        summary.totalPending = count;
        summary.pendingAmount = amount;
        break;
      case "DUE":
        summary.totalDue = count;
        summary.dueAmount = amount;
        break;
      case "PARTIAL":
        summary.totalPartial = count;
        summary.partialAmount = amount;
        break;
      case "PAID":
        summary.totalPaid = count;
        break;
    }
  }

  return summary;
}

/**
 * Get office-owned inventory value (MEET-006)
 */
export async function getOfficeOwnedInventoryValue(): Promise<{
  totalBatches: number;
  totalUnits: number;
  totalValue: number;
}> {
  const db = await getDb();
  if (!db) {
    return { totalBatches: 0, totalUnits: 0, totalValue: 0 };
  }

  const [result] = await db
    .select({
      totalBatches: sql<number>`COUNT(*)`,
      totalUnits: sql<string>`COALESCE(SUM(CAST(${batches.onHandQty} AS DECIMAL(20,2))), 0)`,
      totalValue: sql<string>`COALESCE(SUM(CAST(${batches.onHandQty} AS DECIMAL(20,2)) * CAST(COALESCE(${batches.unitCogs}, '0') AS DECIMAL(20,2))), 0)`,
    })
    .from(batches)
    .where(
      and(
        eq(batches.ownershipType, "OFFICE_OWNED"),
        isNull(batches.deletedAt)
      )
    );

  return {
    totalBatches: Number(result?.totalBatches || 0),
    totalUnits: parseFloat(result?.totalUnits || "0"),
    totalValue: parseFloat(result?.totalValue || "0"),
  };
}
