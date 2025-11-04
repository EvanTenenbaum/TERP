/**
 * Inventory Module Utilities
 * Provides calculation helpers, validation, and business logic
 */

import type { Batch } from "../drizzle/schema";

// ============================================================================
// AVAILABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate available quantity for a batch
 * Formula: available = on_hand - reserved - quarantine - hold
 * Never returns negative values
 */
export function calculateAvailableQty(batch: Batch): number {
  const onHand = parseFloat(batch.onHandQty);
  const reserved = parseFloat(batch.reservedQty);
  const quarantine = parseFloat(batch.quarantineQty);
  const hold = parseFloat(batch.holdQty);

  const available = onHand - reserved - quarantine - hold;
  return Math.max(0, available); // Never negative
}

/**
 * Check if batch has sufficient available quantity
 */
export function hasAvailableQty(batch: Batch, requestedQty: number): boolean {
  return calculateAvailableQty(batch) >= requestedQty;
}

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

type BatchStatus =
  | "AWAITING_INTAKE"
  | "LIVE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED";

/**
 * Valid status transitions map
 */
const VALID_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  AWAITING_INTAKE: ["LIVE", "QUARANTINED"],
  LIVE: ["ON_HOLD", "QUARANTINED", "SOLD_OUT"],
  ON_HOLD: ["LIVE", "QUARANTINED"],
  QUARANTINED: ["LIVE", "ON_HOLD", "CLOSED"],
  SOLD_OUT: ["CLOSED"],
  CLOSED: [],
};

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: BatchStatus,
  newStatus: BatchStatus
): boolean {
  if (currentStatus === newStatus) return true;
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get allowed next statuses for a batch
 */
export function getAllowedNextStatuses(
  currentStatus: BatchStatus
): BatchStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

// ============================================================================
// SKU & CODE GENERATION
// ============================================================================

/**
 * Generate SKU in format: BRND-PROD-YYYYMMDD-####
 */
export function generateSKU(
  brandKey: string,
  productKey: string,
  date: Date,
  sequence: number
): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const seqStr = sequence.toString().padStart(4, "0");
  return `${brandKey}-${productKey}-${dateStr}-${seqStr}`;
}

/**
 * Generate Lot Code using atomic sequence generation
 * ✅ FIXED: Uses database sequence instead of random numbers (TERP-INIT-005 Phase 1)
 * Format: LOT-NNNNNN
 */
export async function generateLotCode(): Promise<string> {
  const { getNextSequence } = await import("./sequenceDb");
  return await getNextSequence("lot_code", 6);
}

/**
 * Generate Batch Code using atomic sequence generation
 * ✅ FIXED: Uses database sequence instead of manual sequence (TERP-INIT-005 Phase 1)
 * Format: BATCH-NNNNNN
 */
export async function generateBatchCode(): Promise<string> {
  const { getNextSequence } = await import("./sequenceDb");
  return await getNextSequence("batch_code", 6);
}

/**
 * Normalize brand/product name to 4-char key
 */
export function normalizeToKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
}

// ============================================================================
// STRAIN STANDARDIZER (Product Name Normalization)
// ============================================================================

/**
 * Normalize product name for matching and search
 * Pipeline: lowercase → trim → Unicode NFKC → remove punctuation → collapse whitespace → Title Case
 */
export function normalizeProductName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKC")
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================================================
// COGS VALIDATION
// ============================================================================

type CogsMode = "FIXED" | "RANGE";

/**
 * Validate COGS configuration for a batch
 */
export function validateCOGS(
  mode: CogsMode,
  unitCogs?: string | null,
  unitCogsMin?: string | null,
  unitCogsMax?: string | null
): { valid: boolean; error?: string } {
  switch (mode) {
    case "FIXED":
      if (!unitCogs) {
        return { valid: false, error: "FIXED mode requires unitCogs" };
      }
      break;
    case "RANGE": {
      if (!unitCogsMin || !unitCogsMax) {
        return {
          valid: false,
          error: "RANGE mode requires unitCogsMin and unitCogsMax",
        };
      }
      const min = parseFloat(unitCogsMin);
      const max = parseFloat(unitCogsMax);
      if (min >= max) {
        return {
          valid: false,
          error: "unitCogsMin must be less than unitCogsMax",
        };
      }
      break;
    }
  }
  return { valid: true };
}

/**
 * Check if a sale price is within valid COGS range
 */
export function isPriceValid(batch: Batch, salePrice: number): boolean {
  if (batch.cogsMode === "RANGE" && batch.unitCogsMin && batch.unitCogsMax) {
    const min = parseFloat(batch.unitCogsMin);
    const max = parseFloat(batch.unitCogsMax);
    return salePrice >= min && salePrice <= max;
  }
  return true; // FIXED mode has no price restrictions
}

// ============================================================================
// QUANTITY HELPERS
// ============================================================================

/**
 * Parse quantity string to number safely
 */
export function parseQty(qtyStr: string): number {
  const parsed = parseFloat(qtyStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format quantity number to string
 */
export function formatQty(qty: number): string {
  return qty.toFixed(2);
}

// ============================================================================
// AUDIT HELPERS
// ============================================================================

/**
 * Create before/after snapshot for audit log
 */
export function createAuditSnapshot(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 0);
}

/**
 * Parse metadata JSON safely
 */
export function parseMetadata(
  metadataStr: string | null
): Record<string, unknown> {
  if (!metadataStr) return {};
  try {
    return JSON.parse(metadataStr);
  } catch {
    return {};
  }
}

/**
 * Stringify metadata for storage
 */
export function stringifyMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}
