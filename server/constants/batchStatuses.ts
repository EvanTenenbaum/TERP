/**
 * Batch Status Constants
 * TERP-0008: Centralized batch status definitions to prevent drift and inconsistency
 *
 * This module provides:
 * - Type-safe batch status values
 * - Categorized status lists (sellable, active, etc.)
 * - Helper functions for status checks
 */

/**
 * All valid batch statuses as const array for type inference
 */
export const BATCH_STATUSES = [
  "AWAITING_INTAKE",
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

/**
 * Batch status type derived from the BATCH_STATUSES array
 */
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/**
 * Statuses where batches can be sold/ordered
 * These are "sellable" states where inventory is available for sales
 */
export const SELLABLE_BATCH_STATUSES: readonly BatchStatus[] = [
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
] as const;

/**
 * Statuses where batches are considered "active" (not terminal)
 * Active batches may transition to other states
 */
export const ACTIVE_BATCH_STATUSES: readonly BatchStatus[] = [
  "AWAITING_INTAKE",
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
  "ON_HOLD",
  "QUARANTINED",
] as const;

/**
 * Statuses where batches cannot be sold
 * These batches should be excluded from sales inventory
 */
export const NON_SELLABLE_BATCH_STATUSES: readonly BatchStatus[] = [
  "AWAITING_INTAKE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

/**
 * Terminal statuses - batches in these states cannot transition out
 */
export const TERMINAL_BATCH_STATUSES: readonly BatchStatus[] = [
  "SOLD_OUT",
  "CLOSED",
] as const;

/**
 * Valid status transitions map
 * Defines which status transitions are allowed
 */
export const BATCH_STATUS_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  AWAITING_INTAKE: ["LIVE", "QUARANTINED"],
  LIVE: ["PHOTOGRAPHY_COMPLETE", "ON_HOLD", "QUARANTINED", "SOLD_OUT"],
  PHOTOGRAPHY_COMPLETE: ["LIVE", "ON_HOLD", "QUARANTINED", "SOLD_OUT"],
  ON_HOLD: ["LIVE", "QUARANTINED"],
  QUARANTINED: ["LIVE", "ON_HOLD", "CLOSED"],
  SOLD_OUT: ["CLOSED"],
  CLOSED: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a batch status is sellable
 */
export function isSellableStatus(status: BatchStatus): boolean {
  return SELLABLE_BATCH_STATUSES.includes(status);
}

/**
 * Check if a batch status is active (non-terminal)
 */
export function isActiveStatus(status: BatchStatus): boolean {
  return ACTIVE_BATCH_STATUSES.includes(status);
}

/**
 * Check if a batch status is terminal
 */
export function isTerminalStatus(status: BatchStatus): boolean {
  return TERMINAL_BATCH_STATUSES.includes(status);
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: BatchStatus,
  toStatus: BatchStatus
): boolean {
  if (fromStatus === toStatus) return true;
  return BATCH_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * Get allowed next statuses for a batch
 */
export function getAllowedNextStatuses(status: BatchStatus): BatchStatus[] {
  return BATCH_STATUS_TRANSITIONS[status] || [];
}

/**
 * Type guard to check if a string is a valid BatchStatus
 */
export function isValidBatchStatus(value: string): value is BatchStatus {
  return BATCH_STATUSES.includes(value as BatchStatus);
}

/**
 * Status display labels for UI
 */
export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Live",
  PHOTOGRAPHY_COMPLETE: "Photography Complete",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

/**
 * Status colors for UI badges
 */
export const BATCH_STATUS_COLORS: Record<
  BatchStatus,
  { bg: string; text: string }
> = {
  AWAITING_INTAKE: { bg: "bg-yellow-100", text: "text-yellow-800" },
  LIVE: { bg: "bg-green-100", text: "text-green-800" },
  PHOTOGRAPHY_COMPLETE: { bg: "bg-blue-100", text: "text-blue-800" },
  ON_HOLD: { bg: "bg-orange-100", text: "text-orange-800" },
  QUARANTINED: { bg: "bg-red-100", text: "text-red-800" },
  SOLD_OUT: { bg: "bg-gray-100", text: "text-gray-800" },
  CLOSED: { bg: "bg-gray-200", text: "text-gray-600" },
};
