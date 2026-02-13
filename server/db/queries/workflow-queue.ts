/**
 * Database Queries for Workflow Queue Management
 * Initiative: 1.3 Workflow Queue Management
 * 
 * This module provides database access functions for:
 * - Workflow status management
 * - Batch status updates
 * - Status history tracking
 */

import { getDb } from "../../db";
import { 
  workflowStatuses, 
  batchStatusHistory, 
  batches,
  type WorkflowStatus,
  type InsertWorkflowStatus,
  type BatchStatusHistory,
} from "../../../drizzle/schema";
import { eq, desc, asc, sql } from "drizzle-orm";

// ============================================================================
// WORKFLOW STATUS QUERIES
// ============================================================================

/**
 * Get all active workflow statuses, ordered by display order
 */
export async function getAllActiveStatuses(): Promise<WorkflowStatus[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(workflowStatuses)
    .where(eq(workflowStatuses.isActive, 1))
    .orderBy(asc(workflowStatuses.order));
}

/**
 * Get a workflow status by ID
 */
export async function getStatusById(id: number): Promise<WorkflowStatus | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(workflowStatuses)
    .where(eq(workflowStatuses.id, id))
    .limit(1);
  
  return results[0];
}

/**
 * Get a workflow status by slug
 */
export async function getStatusBySlug(slug: string): Promise<WorkflowStatus | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(workflowStatuses)
    .where(eq(workflowStatuses.slug, slug))
    .limit(1);
  
  return results[0];
}

/**
 * Create a new workflow status
 */
export async function createStatus(data: InsertWorkflowStatus): Promise<WorkflowStatus> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workflowStatuses).values(data);
  const newStatus = await getStatusById(Number(result[0].insertId));
  
  if (!newStatus) {
    throw new Error("Failed to create workflow status");
  }
  
  return newStatus;
}

/**
 * Update a workflow status
 */
export async function updateStatus(
  id: number,
  data: Partial<InsertWorkflowStatus>
): Promise<WorkflowStatus> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(workflowStatuses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workflowStatuses.id, id));
  
  const updated = await getStatusById(id);
  
  if (!updated) {
    throw new Error(`Workflow status ${id} not found`);
  }
  
  return updated;
}

/**
 * Soft delete a workflow status (set isActive = 0)
 */
export async function deleteStatus(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(workflowStatuses)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(workflowStatuses.id, id));
}

/**
 * Reorder workflow statuses
 */
export async function reorderStatuses(statusIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update each status with its new order
  const updates = statusIds.map((id, index) =>
    db
      .update(workflowStatuses)
      .set({ order: index + 1, updatedAt: new Date() })
      .where(eq(workflowStatuses.id, id))
  );
  
  await Promise.all(updates);
}

// ============================================================================
// BATCH STATUS QUERIES
// ============================================================================

/**
 * Get all batches grouped by workflow status
 */
export async function getBatchesByStatus(): Promise<
  Record<number, Array<typeof batches.$inferSelect>>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allBatches = await db
    .select()
    .from(batches)
    .where(sql`${batches.statusId} IS NOT NULL`)
    .orderBy(desc(batches.updatedAt));
  
  // Group by statusId
  const grouped: Record<number, Array<typeof batches.$inferSelect>> = {};
  
  for (const batch of allBatches) {
    if (batch.statusId) {
      if (!grouped[batch.statusId]) {
        grouped[batch.statusId] = [];
      }
      grouped[batch.statusId].push(batch);
    }
  }
  
  return grouped;
}

/**
 * Get batches for a specific workflow status
 */
export async function getBatchesByStatusId(
  statusId: number
): Promise<Array<typeof batches.$inferSelect>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(batches)
    .where(eq(batches.statusId, statusId))
    .orderBy(desc(batches.updatedAt));
}

/**
 * Update a batch's workflow status
 */
export async function updateBatchStatus(
  batchId: number,
  toStatusId: number,
  changedBy: number,
  notes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current status
  const batch = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);
  
  if (!batch[0]) {
    throw new Error(`Batch ${batchId} not found`);
  }
  
  const fromStatusId = batch[0].statusId;
  
  // Update batch status
  await db
    .update(batches)
    .set({ statusId: toStatusId, updatedAt: new Date() })
    .where(eq(batches.id, batchId));
  
  // Create history entry
  await db.insert(batchStatusHistory).values({
    batchId,
    fromStatusId: fromStatusId ?? undefined,
    toStatusId,
    changedBy,
    notes: notes ?? undefined,
  });
}

// ============================================================================
// BATCH STATUS HISTORY QUERIES
// ============================================================================

/**
 * Get status change history for a batch
 */
export async function getBatchStatusHistory(
  batchId: number
): Promise<BatchStatusHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(batchStatusHistory)
    .where(eq(batchStatusHistory.batchId, batchId))
    .orderBy(desc(batchStatusHistory.createdAt));
}

/**
 * Get recent status changes across all batches
 */
export async function getRecentStatusChanges(
  limit: number = 50
): Promise<BatchStatusHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(batchStatusHistory)
    .orderBy(desc(batchStatusHistory.createdAt))
    .limit(limit);
}

/**
 * Get status change history for a specific user
 */
export async function getStatusChangesByUser(
  userId: number,
  limit: number = 50
): Promise<BatchStatusHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(batchStatusHistory)
    .where(eq(batchStatusHistory.changedBy, userId))
    .orderBy(desc(batchStatusHistory.createdAt))
    .limit(limit);
}

/**
 * Get batches not in workflow queue (statusId is null)
 */
export async function getBatchesNotInQueue(
  limit: number = 50,
  query?: string
): Promise<Array<typeof batches.$inferSelect>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let batchQuery = db
    .select()
    .from(batches)
    .where(sql`${batches.statusId} IS NULL`)
    .orderBy(desc(batches.createdAt))
    .limit(limit);

  // If query provided, filter by SKU or product name
  if (query) {
    const searchTerm = `%${query}%`;
    batchQuery = db
      .select()
      .from(batches)
      .where(
        sql`${batches.statusId} IS NULL AND (${batches.sku} LIKE ${searchTerm} OR ${batches.code} LIKE ${searchTerm})`
      )
      .orderBy(desc(batches.createdAt))
      .limit(limit) as typeof batchQuery;
  }
  
  return batchQuery;
}
