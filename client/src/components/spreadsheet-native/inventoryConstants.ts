/**
 * Shared inventory constants used by InventoryManagementSurface and InventoryAdvancedFilters.
 */

export const STATUS_OPTIONS = [
  "AWAITING_INTAKE",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

export type InventoryBatchStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABELS: Record<InventoryBatchStatus, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Live",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

export const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);

export const mod = isMac ? "\u2318" : "Ctrl";
