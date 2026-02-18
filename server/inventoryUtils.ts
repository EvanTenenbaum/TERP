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
 * ✅ ENHANCED: TERP-INIT-005 Phase 3 - Centralized quantity calculation
 * Formula: available = on_hand - reserved - quarantine - hold
 * Never returns negative values
 */
export function calculateAvailableQty(batch: Batch): number {
  const onHand = parseFloat(batch.onHandQty || "0");
  const reserved = parseFloat(batch.reservedQty || "0");
  const quarantine = parseFloat(batch.quarantineQty || "0");
  const hold = parseFloat(batch.holdQty || "0");

  const available = onHand - reserved - quarantine - hold;
  return Math.max(0, available); // Never negative
}

/**
 * Validate quantity consistency for a batch
 * ✅ ADDED: TERP-INIT-005 Phase 3 - Quantity consistency checks
 *
 * Ensures:
 * 1. All quantities are non-negative
 * 2. Reserved + Quarantine + Hold ≤ On Hand
 * 3. No NaN values
 */
export function validateQuantityConsistency(batch: Batch): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const onHand = parseFloat(batch.onHandQty || "0");
  const reserved = parseFloat(batch.reservedQty || "0");
  const quarantine = parseFloat(batch.quarantineQty || "0");
  const hold = parseFloat(batch.holdQty || "0");
  const defective = parseFloat(batch.defectiveQty || "0");

  // Check for NaN
  if (isNaN(onHand)) errors.push("onHandQty is not a valid number");
  if (isNaN(reserved)) errors.push("reservedQty is not a valid number");
  if (isNaN(quarantine)) errors.push("quarantineQty is not a valid number");
  if (isNaN(hold)) errors.push("holdQty is not a valid number");
  if (isNaN(defective)) errors.push("defectiveQty is not a valid number");

  // Check for negative values
  if (onHand < 0) errors.push("onHandQty cannot be negative");
  if (reserved < 0) errors.push("reservedQty cannot be negative");
  if (quarantine < 0) errors.push("quarantineQty cannot be negative");
  if (hold < 0) errors.push("holdQty cannot be negative");
  if (defective < 0) errors.push("defectiveQty cannot be negative");

  // Check allocation consistency
  const totalAllocated = reserved + quarantine + hold;
  if (totalAllocated > onHand) {
    errors.push(
      `Total allocated (${totalAllocated}) exceeds on-hand quantity (${onHand})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get quantity breakdown for a batch
 * ✅ ADDED: TERP-INIT-005 Phase 3 - Quantity breakdown utility
 */
export function getQuantityBreakdown(batch: Batch): {
  onHand: number;
  reserved: number;
  quarantine: number;
  hold: number;
  defective: number;
  available: number;
  totalAllocated: number;
} {
  const onHand = parseFloat(batch.onHandQty || "0");
  const reserved = parseFloat(batch.reservedQty || "0");
  const quarantine = parseFloat(batch.quarantineQty || "0");
  const hold = parseFloat(batch.holdQty || "0");
  const defective = parseFloat(batch.defectiveQty || "0");
  const available = calculateAvailableQty(batch);
  const totalAllocated = reserved + quarantine + hold;

  return {
    onHand,
    reserved,
    quarantine,
    hold,
    defective,
    available,
    totalAllocated,
  };
}

/**
 * Check if batch has sufficient available quantity
 */
export function hasAvailableQty(batch: Batch, requestedQty: number): boolean {
  return calculateAvailableQty(batch) >= requestedQty;
}

// ============================================================================
// STATUS TRANSITION VALIDATION
// TERP-0008: Re-export from centralized constants for backward compatibility
// ============================================================================

// Import and re-export from centralized constants for backward compatibility
import {
  type BatchStatus as BatchStatusType,
  BATCH_STATUSES,
  SELLABLE_BATCH_STATUSES,
  ACTIVE_BATCH_STATUSES,
  NON_SELLABLE_BATCH_STATUSES,
  TERMINAL_BATCH_STATUSES,
  BATCH_STATUS_TRANSITIONS,
  isSellableStatus,
  isActiveStatus,
  isTerminalStatus,
  isValidStatusTransition,
  getAllowedNextStatuses,
  isValidBatchStatus,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
} from "./constants/batchStatuses";

// Re-export for backward compatibility
export type BatchStatus = BatchStatusType;
export {
  BATCH_STATUSES,
  SELLABLE_BATCH_STATUSES,
  ACTIVE_BATCH_STATUSES,
  NON_SELLABLE_BATCH_STATUSES,
  TERMINAL_BATCH_STATUSES,
  BATCH_STATUS_TRANSITIONS,
  isSellableStatus,
  isActiveStatus,
  isTerminalStatus,
  isValidStatusTransition,
  getAllowedNextStatuses,
  isValidBatchStatus,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
};

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

/**
 * Compute totalQty as the sum of all component quantity fields.
 * totalQty is NOT stored in the database — it is always derived.
 *
 * Fields summed: onHandQty + sampleQty + reservedQty + quarantineQty + holdQty + defectiveQty
 *
 * Returns a decimal string with 4 places, e.g. "125.0000".
 * Null or missing fields default to 0.
 */
export function computeTotalQty(batch: {
  onHandQty?: string | null;
  sampleQty?: string | null;
  reservedQty?: string | null;
  quarantineQty?: string | null;
  holdQty?: string | null;
  defectiveQty?: string | null;
}): string {
  const total =
    parseFloat(batch.onHandQty || "0") +
    parseFloat(batch.sampleQty || "0") +
    parseFloat(batch.reservedQty || "0") +
    parseFloat(batch.quarantineQty || "0") +
    parseFloat(batch.holdQty || "0") +
    parseFloat(batch.defectiveQty || "0");
  return total.toFixed(4);
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
 * Batch Metadata Schema
 * ✅ ADDED: TERP-INIT-005 Phase 3 - Enforced metadata structure
 */
export interface BatchMetadata {
  // Compliance & Testing
  testResults?: {
    thc?: number;
    cbd?: number;
    terpenes?: string[];
    contaminants?: string[];
    testDate?: string;
    labName?: string;
  };

  // Packaging
  packaging?: {
    type?: string; // "jar", "bag", "box", etc.
    size?: string; // "1g", "3.5g", "1oz", etc.
    material?: string;
  };

  // Sourcing
  sourcing?: {
    growMethod?: string; // "indoor", "outdoor", "greenhouse"
    organic?: boolean;
    region?: string;
  };

  // Custom fields
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * Validate metadata against schema
 * ✅ ADDED: TERP-INIT-005 Phase 3 - Metadata validation
 */
export function validateMetadata(metadata: unknown): {
  valid: boolean;
  errors: string[];
  data?: BatchMetadata;
} {
  const errors: string[] = [];

  if (metadata === null || metadata === undefined) {
    return { valid: true, errors: [], data: {} };
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      valid: false,
      errors: ["Metadata must be an object"],
    };
  }

  const data = metadata as Record<string, unknown>;

  // Validate testResults if present
  if (data.testResults !== undefined) {
    if (
      typeof data.testResults !== "object" ||
      Array.isArray(data.testResults)
    ) {
      errors.push("testResults must be an object");
    } else {
      const tr = data.testResults as Record<string, unknown>;
      if (tr.thc !== undefined && typeof tr.thc !== "number") {
        errors.push("testResults.thc must be a number");
      }
      if (tr.cbd !== undefined && typeof tr.cbd !== "number") {
        errors.push("testResults.cbd must be a number");
      }
      if (tr.terpenes !== undefined && !Array.isArray(tr.terpenes)) {
        errors.push("testResults.terpenes must be an array");
      }
    }
  }

  // Validate packaging if present
  if (data.packaging !== undefined) {
    if (typeof data.packaging !== "object" || Array.isArray(data.packaging)) {
      errors.push("packaging must be an object");
    }
  }

  // Validate sourcing if present
  if (data.sourcing !== undefined) {
    if (typeof data.sourcing !== "object" || Array.isArray(data.sourcing)) {
      errors.push("sourcing must be an object");
    } else {
      const s = data.sourcing as Record<string, unknown>;
      if (s.organic !== undefined && typeof s.organic !== "boolean") {
        errors.push("sourcing.organic must be a boolean");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: data as BatchMetadata,
  };
}

/**
 * Parse metadata JSON safely with validation
 * ✅ ENHANCED: TERP-INIT-005 Phase 3 - Added schema validation
 */
export function parseMetadata(metadataStr: string | null): BatchMetadata {
  if (!metadataStr) return {};
  try {
    const parsed = JSON.parse(metadataStr);
    const validation = validateMetadata(parsed);
    if (!validation.valid) {
      console.warn("Invalid metadata structure:", validation.errors);
      return {};
    }
    return validation.data || {};
  } catch {
    return {};
  }
}

/**
 * Stringify metadata for storage
 * ✅ ENHANCED: TERP-INIT-005 Phase 3 - Validates before stringifying
 */
export function stringifyMetadata(metadata: Record<string, unknown>): string {
  const validation = validateMetadata(metadata);
  if (!validation.valid) {
    throw new Error(`Invalid metadata: ${validation.errors.join(", ")}`);
  }
  return JSON.stringify(metadata);
}

// List of all exported functions for default export
export default {
  calculateAvailableQty,
  validateQuantityConsistency,
  getQuantityBreakdown,
  hasAvailableQty,
  isValidStatusTransition,
  getAllowedNextStatuses,
  generateSKU,
  generateLotCode,
  generateBatchCode,
  normalizeToKey,
  normalizeProductName,
  validateCOGS,
  isPriceValid,
  parseQty,
  formatQty,
  computeTotalQty,
  createAuditSnapshot,
  validateMetadata,
  parseMetadata,
  stringifyMetadata,
};
