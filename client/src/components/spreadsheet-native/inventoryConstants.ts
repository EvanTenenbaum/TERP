/**
 * Shared inventory constants used by InventoryManagementSurface and InventoryAdvancedFilters.
 * TER-1220: Consolidated batch status definitions - re-exporting from server/constants/batchStatuses.ts
 */

import {
  BATCH_STATUSES,
  BATCH_STATUS_LABELS,
  type BatchStatus,
} from "../../../../server/constants/batchStatuses";

// Re-export server constants with client-facing names for backward compatibility
export const STATUS_OPTIONS = BATCH_STATUSES;
export type InventoryBatchStatus = BatchStatus;
export const STATUS_LABELS = BATCH_STATUS_LABELS;

// Platform detection utilities (unrelated to batch status)
export const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);

export const mod = isMac ? "\u2318" : "Ctrl";
