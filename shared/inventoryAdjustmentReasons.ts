export const INVENTORY_ADJUSTMENT_REASONS = [
  "DAMAGED",
  "EXPIRED",
  "LOST",
  "THEFT",
  "COUNT_DISCREPANCY",
  "QUALITY_ISSUE",
  "REWEIGH",
  "OTHER",
] as const;

export type InventoryAdjustmentReason =
  (typeof INVENTORY_ADJUSTMENT_REASONS)[number];

export const INVENTORY_ADJUSTMENT_REASON_LABELS: Record<
  InventoryAdjustmentReason,
  string
> = {
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
  LOST: "Lost",
  THEFT: "Theft",
  COUNT_DISCREPANCY: "Count Discrepancy",
  QUALITY_ISSUE: "Quality Issue",
  REWEIGH: "Reweigh",
  OTHER: "Other",
};

export function formatInventoryAdjustmentReason(
  reason: InventoryAdjustmentReason
): string {
  return INVENTORY_ADJUSTMENT_REASON_LABELS[reason];
}
