/**
 * Comprehensive Validation Schemas
 * ✅ TERP-INIT-005 Phase 2 - Enhanced Zod schemas with strict validation
 */

import { z } from "zod";

/**
 * Common validation patterns
 */
const patterns = {
  // Entity names: allow common business punctuation
  name: /^[a-zA-Z0-9\s_\-.'&(),:/+]+$/,
  // Positive decimal number (up to 2 decimal places)
  decimal: /^\d+(\.\d{1,2})?$/,
  // Site value (supports both code-like and human-readable names)
  siteCode: /^[A-Za-z0-9\s_-]+$/,
  // Location code (alphanumeric with hyphens)
  locationCode: /^[A-Z0-9-]+$/,
};

/**
 * Reusable field validators
 */
export const validators = {
  /**
   * Positive integer
   */
  positiveInt: z.number().int().positive("Must be a positive integer"),

  /**
   * Non-negative integer
   */
  nonNegativeInt: z.number().int().min(0, "Must be non-negative"),

  /**
   * Positive decimal (quantity, price, etc.)
   */
  positiveDecimal: z
    .number()
    .positive("Must be a positive number")
    .refine(val => Number.isFinite(val), "Must be a finite number")
    .refine(val => {
      const str = val.toString();
      const decimalPart = str.split(".")[1];
      return !decimalPart || decimalPart.length <= 2;
    }, "Maximum 2 decimal places"),

  /**
   * Entity name (vendor, brand, product, etc.)
   */
  entityName: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .regex(
      patterns.name,
      "Name can only contain letters, numbers, spaces, and common punctuation (- _ . ' & ( ) , : / +)"
    ),

  /**
   * Site code
   */
  siteCode: z
    .string()
    .trim()
    .min(1, "Site is required")
    .max(50, "Site code must be 50 characters or less")
    .regex(
      patterns.siteCode,
      "Site must be alphanumeric and may include spaces, hyphens, or underscores"
    ),

  /**
   * Location code (zone, rack, shelf, bin)
   */
  locationCode: z
    .string()
    .max(50, "Location code must be 50 characters or less")
    .regex(
      patterns.locationCode,
      "Location code must be alphanumeric with hyphens"
    )
    .optional(),

  /**
   * COGS (Cost of Goods Sold) string
   */
  cogsString: z
    .string()
    .regex(patterns.decimal, "Must be a valid decimal number (e.g., 10.50)")
    .refine(val => {
      const num = parseFloat(val);
      return num > 0 && num < 1000000;
    }, "COGS must be between 0 and 1,000,000"),

  /**
   * Category
   */
  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category must be 100 characters or less"),

  /**
   * Subcategory
   */
  subcategory: z
    .string()
    .max(100, "Subcategory must be 100 characters or less")
    .optional(),

  /**
   * Grade
   */
  grade: z.string().max(50, "Grade must be 50 characters or less").optional(),

  /**
   * Batch status
   */
  batchStatus: z.enum([
    "AWAITING_INTAKE",
    "LIVE",
    "PHOTOGRAPHY_COMPLETE",
    "ON_HOLD",
    "QUARANTINED",
    "SOLD_OUT",
    "CLOSED",
  ]),

  /**
   * Payment terms
   */
  paymentTerms: z.enum([
    "COD",
    "NET_7",
    "NET_15",
    "NET_30",
    "CONSIGNMENT",
    "PARTIAL",
  ]),

  /**
   * COGS mode
   */
  cogsMode: z.enum(["FIXED", "RANGE"]),

  /**
   * Metadata (JSON object)
   */
  metadata: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Location schema
 */
export const locationSchema = z.object({
  site: validators.siteCode,
  zone: validators.locationCode,
  rack: validators.locationCode,
  shelf: validators.locationCode,
  bin: validators.locationCode,
});

/**
 * COGS validation with inter-field dependencies
 */
export const cogsSchema = z
  .object({
    cogsMode: validators.cogsMode,
    unitCogs: validators.cogsString.optional(),
    unitCogsMin: validators.cogsString.optional(),
    unitCogsMax: validators.cogsString.optional(),
  })
  .refine(
    data => {
      if (data.cogsMode === "FIXED") {
        return !!data.unitCogs;
      }
      return true;
    },
    {
      message: "unitCogs is required when cogsMode is FIXED",
      path: ["unitCogs"],
    }
  )
  .refine(
    data => {
      if (data.cogsMode === "RANGE") {
        return !!data.unitCogsMin && !!data.unitCogsMax;
      }
      return true;
    },
    {
      message:
        "unitCogsMin and unitCogsMax are required when cogsMode is RANGE",
      path: ["unitCogsMin"],
    }
  )
  .refine(
    data => {
      if (data.cogsMode === "RANGE" && data.unitCogsMin && data.unitCogsMax) {
        const min = parseFloat(data.unitCogsMin);
        const max = parseFloat(data.unitCogsMax);
        return min < max;
      }
      return true;
    },
    {
      message: "unitCogsMin must be less than unitCogsMax",
      path: ["unitCogsMax"],
    }
  );

/**
 * Enhanced intake schema with comprehensive validation
 */
export const intakeSchema = z
  .object({
    vendorName: validators.entityName,
    brandName: validators.entityName,
    productName: validators.entityName,
    category: validators.category,
    subcategory: validators.subcategory,
    grade: validators.grade,
    strainId: validators.positiveInt.nullable().optional(),
    quantity: validators.positiveDecimal,
    cogsMode: validators.cogsMode,
    unitCogs: validators.cogsString.optional(),
    unitCogsMin: validators.cogsString.optional(),
    unitCogsMax: validators.cogsString.optional(),
    paymentTerms: validators.paymentTerms,
    location: locationSchema,
    metadata: validators.metadata,
    mediaUrls: z
      .array(
        z.object({
          url: z.string().url(),
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
        })
      )
      .optional(), // BUG-004: Media file URLs
  })
  .merge(cogsSchema.omit({ cogsMode: true })); // Merge COGS validation

/**
 * Batch update schema
 */
export const batchUpdateSchema = z.object({
  id: validators.positiveInt,
  status: validators.batchStatus,
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or less")
    .optional(),
});

/**
 * Quantity adjustment schema
 */
export const quantityAdjustmentSchema = z.object({
  batchId: validators.positiveInt,
  quantity: validators.positiveDecimal,
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be 500 characters or less"),
});

/**
 * List query schema
 */
/**
 * List query schema with cursor-based pagination
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
 */
export const listQuerySchema = z.object({
  query: z.string().max(255, "Query must be 255 characters or less").optional(),
  limit: validators.positiveInt
    .max(1000, "Limit must be 1000 or less")
    .default(100),
  // Cursor-based pagination (preferred for large datasets)
  // FIX: Use nonNegativeInt to allow cursor: 0 for first page
  cursor: validators.nonNegativeInt.optional(),
  // Offset-based pagination (legacy support)
  offset: validators.nonNegativeInt.default(0),
  // Filters
  status: validators.batchStatus.optional(),
  category: validators.category.optional(),
});

/**
 * Bulk operation schema
 */
export const bulkOperationSchema = z.object({
  batchIds: z
    .array(validators.positiveInt)
    .min(1, "At least one batch ID is required")
    .max(100, "Maximum 100 batches per bulk operation"),
});

/**
 * Inventory movement schema
 */
export const inventoryMovementSchema = z.object({
  batchId: validators.positiveInt,
  movementType: z.enum(["SALE", "REFUND_RETURN", "ADJUSTMENT", "TRANSFER"]),
  quantityChange: z
    .string()
    .regex(/^[+-]?\d+(\.\d{1,2})?$/, "Invalid quantity format"),
  referenceType: z
    .string()
    .max(50, "Reference type must be 50 characters or less")
    .optional(),
  referenceId: validators.positiveInt.optional(),
  reason: z
    .string()
    .max(500, "Reason must be 500 characters or less")
    .optional(),
});
