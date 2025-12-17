import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { intakeSessions, intakeSessionBatches, batches, clients, users } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Create a new intake session
 */
export async function createIntakeSession(data: {
  vendorId: number;
  receiveDate: string;
  receivedBy: number;
  paymentTerms: string;
  paymentDueDate?: string;
  internalNotes?: string;
  vendorNotes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Generate session number
    const sessionNumber = `INTAKE-${Date.now()}`;

    const [session] = await db.insert(intakeSessions).values({
      sessionNumber,
      vendorId: data.vendorId,
      receiveDate: data.receiveDate,
      receivedBy: data.receivedBy,
      paymentTerms: data.paymentTerms as any,
      paymentDueDate: data.paymentDueDate,
      internalNotes: data.internalNotes,
      vendorNotes: data.vendorNotes,
      status: "IN_PROGRESS",
    } as any);

    return { success: true, sessionId: session.insertId, sessionNumber };
  } catch (error) {
    logger.error("Error creating intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Add a batch to an intake session
 */
export async function addBatchToIntakeSession(data: {
  intakeSessionId: number;
  batchId: number;
  receivedQty: number;
  unitCost: number;
  internalNotes?: string;
  vendorNotes?: string;
  cogsAgreement?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const totalCost = data.receivedQty * data.unitCost;

    await db.insert(intakeSessionBatches).values({
      intakeSessionId: data.intakeSessionId,
      batchId: data.batchId,
      receivedQty: data.receivedQty.toString(),
      unitCost: data.unitCost.toString(),
      totalCost: totalCost.toString(),
      internalNotes: data.internalNotes,
      vendorNotes: data.vendorNotes,
      cogsAgreement: data.cogsAgreement,
    });

    // Update session total
    const sessionBatches = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.intakeSessionId, data.intakeSessionId));

    const totalAmount = sessionBatches.reduce(
      (sum, batch) => sum + parseFloat(batch.totalCost),
      0
    );

    await db
      .update(intakeSessions)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(intakeSessions.id, data.intakeSessionId));

    return { success: true };
  } catch (error) {
    logger.error("Error adding batch to intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Update batch details in intake session
 */
export async function updateIntakeSessionBatch(
  intakeSessionBatchId: number,
  data: {
    receivedQty?: number;
    unitCost?: number;
    internalNotes?: string;
    vendorNotes?: string;
    cogsAgreement?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.id, intakeSessionBatchId));

    if (!existing) {
      return { success: false, error: "Intake session batch not found" };
    }

    const receivedQty = data.receivedQty ?? parseFloat(existing.receivedQty);
    const unitCost = data.unitCost ?? parseFloat(existing.unitCost);
    const totalCost = receivedQty * unitCost;

    await db
      .update(intakeSessionBatches)
      .set({
        receivedQty: receivedQty.toString(),
        unitCost: unitCost.toString(),
        totalCost: totalCost.toString(),
        internalNotes: data.internalNotes ?? existing.internalNotes,
        vendorNotes: data.vendorNotes ?? existing.vendorNotes,
        cogsAgreement: data.cogsAgreement ?? existing.cogsAgreement,
      })
      .where(eq(intakeSessionBatches.id, intakeSessionBatchId));

    // Recalculate session total
    const sessionBatches = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.intakeSessionId, existing.intakeSessionId));

    const totalAmount = sessionBatches.reduce(
      (sum, batch) => sum + parseFloat(batch.totalCost),
      0
    );

    await db
      .update(intakeSessions)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(intakeSessions.id, existing.intakeSessionId));

    return { success: true };
  } catch (error) {
    logger.error("Error updating intake session batch", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Remove a batch from intake session
 */
export async function removeBatchFromIntakeSession(intakeSessionBatchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.id, intakeSessionBatchId));

    if (!existing) {
      return { success: false, error: "Intake session batch not found" };
    }

    const intakeSessionId = existing.intakeSessionId;

    await db
      .delete(intakeSessionBatches)
      .where(eq(intakeSessionBatches.id, intakeSessionBatchId));

    // Recalculate session total
    const sessionBatches = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.intakeSessionId, intakeSessionId));

    const totalAmount = sessionBatches.reduce(
      (sum, batch) => sum + parseFloat(batch.totalCost),
      0
    );

    await db
      .update(intakeSessions)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(intakeSessions.id, intakeSessionId));

    return { success: true };
  } catch (error) {
    logger.error("Error removing batch from intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Complete intake session and update batch quantities
 */
export async function completeIntakeSession(intakeSessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get session and all batches
    const [session] = await db
      .select()
      .from(intakeSessions)
      .where(eq(intakeSessions.id, intakeSessionId));

    if (!session) {
      return { success: false, error: "Intake session not found" };
    }

    if (session.status !== "IN_PROGRESS") {
      return { success: false, error: "Session is not in progress" };
    }

    const sessionBatches = await db
      .select()
      .from(intakeSessionBatches)
      .where(eq(intakeSessionBatches.intakeSessionId, intakeSessionId));

    if (sessionBatches.length === 0) {
      return { success: false, error: "No batches in session" };
    }

    // Update each batch quantity
    for (const sessionBatch of sessionBatches) {
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, sessionBatch.batchId));

      if (batch) {
        const currentQty = parseFloat(batch.onHandQty);
        const receivedQty = parseFloat(sessionBatch.receivedQty);
        const newQty = currentQty + receivedQty;

        await db
          .update(batches)
          .set({
            onHandQty: newQty.toString(),
            batchStatus: "LIVE",
          })
          .where(eq(batches.id, sessionBatch.batchId));
      }
    }

    // Mark session as completed
    await db
      .update(intakeSessions)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
      })
      .where(eq(intakeSessions.id, intakeSessionId));

    return { success: true };
  } catch (error) {
    logger.error("Error completing intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Generate vendor receipt for intake session
 */
export async function generateVendorReceipt(intakeSessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get session with vendor details
    const [session] = await db
      .select({
        session: intakeSessions,
        vendor: clients,
        receiver: users,
      })
      .from(intakeSessions)
      .leftJoin(clients, eq(intakeSessions.vendorId, clients.id))
      .leftJoin(users, eq(intakeSessions.receivedBy, users.id))
      .where(eq(intakeSessions.id, intakeSessionId));

    if (!session) {
      return { success: false, error: "Intake session not found" };
    }

    // Get all batches with product details
    const sessionBatches = await db
      .select({
        batch: intakeSessionBatches,
        batchInfo: batches,
      })
      .from(intakeSessionBatches)
      .leftJoin(batches, eq(intakeSessionBatches.batchId, batches.id))
      .where(eq(intakeSessionBatches.intakeSessionId, intakeSessionId));

    // Build receipt data
    const receipt = {
      sessionNumber: session.session.sessionNumber,
      receiveDate: session.session.receiveDate,
      vendor: {
        name: session.vendor?.name,
        teriCode: session.vendor?.teriCode,
        address: session.vendor?.address,
        phone: session.vendor?.phone,
        email: session.vendor?.email,
      },
      receivedBy: session.receiver?.name,
      paymentTerms: session.session.paymentTerms,
      paymentDueDate: session.session.paymentDueDate,
      vendorNotes: session.session.vendorNotes,
      batches: sessionBatches.map((sb) => ({
        batchCode: sb.batchInfo?.code,
        sku: sb.batchInfo?.sku,
        receivedQty: sb.batch.receivedQty,
        unitCost: sb.batch.unitCost,
        totalCost: sb.batch.totalCost,
        cogsAgreement: sb.batch.cogsAgreement,
        vendorNotes: sb.batch.vendorNotes,
      })),
      totalAmount: session.session.totalAmount,
      amountPaid: session.session.amountPaid,
      balanceDue: (
        parseFloat(session.session.totalAmount || "0") - parseFloat(session.session.amountPaid || "0")
      ).toFixed(2),
    };

    // Mark receipt as generated
    await db
      .update(intakeSessions)
      .set({
        receiptGenerated: true,
        receiptGeneratedAt: new Date() as any,
      })
      .where(eq(intakeSessions.id, intakeSessionId));

    return { success: true, receipt };
  } catch (error) {
    logger.error("Error generating vendor receipt", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get intake session details
 */
export async function getIntakeSession(intakeSessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [session] = await db
      .select({
        session: intakeSessions,
        vendor: clients,
        receiver: users,
      })
      .from(intakeSessions)
      .leftJoin(clients, eq(intakeSessions.vendorId, clients.id))
      .leftJoin(users, eq(intakeSessions.receivedBy, users.id))
      .where(eq(intakeSessions.id, intakeSessionId));

    if (!session) {
      return { success: false, error: "Intake session not found" };
    }

    const sessionBatches = await db
      .select({
        intakeBatch: intakeSessionBatches,
        batch: batches,
      })
      .from(intakeSessionBatches)
      .leftJoin(batches, eq(intakeSessionBatches.batchId, batches.id))
      .where(eq(intakeSessionBatches.intakeSessionId, intakeSessionId));

    return {
      success: true,
      session: {
        ...session.session,
        vendor: session.vendor,
        receiver: session.receiver,
        batches: sessionBatches,
      },
    };
  } catch (error) {
    logger.error("Error getting intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * List intake sessions
 */
export async function listIntakeSessions(filters?: {
  vendorId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = db
      .select({
        session: intakeSessions,
        vendor: clients,
        receiver: users,
      })
      .from(intakeSessions)
      .leftJoin(clients, eq(intakeSessions.vendorId, clients.id))
      .leftJoin(users, eq(intakeSessions.receivedBy, users.id))
      .orderBy(desc(intakeSessions.createdAt));

    const sessions = await query;

    return { success: true, sessions };
  } catch (error) {
    logger.error("Error listing intake sessions", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Cancel intake session
 */
export async function cancelIntakeSession(intakeSessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [session] = await db
      .select()
      .from(intakeSessions)
      .where(eq(intakeSessions.id, intakeSessionId));

    if (!session) {
      return { success: false, error: "Intake session not found" };
    }

    if (session.status !== "IN_PROGRESS") {
      return { success: false, error: "Can only cancel in-progress sessions" };
    }

    await db
      .update(intakeSessions)
      .set({ status: "CANCELLED" })
      .where(eq(intakeSessions.id, intakeSessionId));

    return { success: true };
  } catch (error) {
    logger.error("Error cancelling intake session", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

