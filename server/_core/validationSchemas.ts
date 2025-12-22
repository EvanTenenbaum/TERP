/**
 * Shared Validation Schemas
 * Reusable Zod schemas for consistent validation across routers
 * 
 * QUAL-002: Comprehensive Input Validation
 * Created: 2025-12-22
 */

import { z } from "zod";

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

/**
 * Positive integer ID (for database primary keys)
 */
export const idSchema = z.number().int().positive("ID must be a positive integer");

/**
 * Optional positive integer ID
 */
export const optionalIdSchema = z.number().int().positive("ID must be a positive integer").optional();

/**
 * Non-empty string with reasonable length limits
 */
export const nameSchema = z.string()
  .min(1, "Name is required")
  .max(255, "Name must be 255 characters or less");

/**
 * Optional name string
 */
export const optionalNameSchema = z.string()
  .min(1, "Name cannot be empty if provided")
  .max(255, "Name must be 255 characters or less")
  .optional();

/**
 * Description field (longer text)
 */
export const descriptionSchema = z.string()
  .max(5000, "Description must be 5000 characters or less")
  .optional();

/**
 * Email address
 */
export const emailSchema = z.string()
  .email("Invalid email address")
  .max(255, "Email must be 255 characters or less");

/**
 * Optional email address
 */
export const optionalEmailSchema = z.string()
  .email("Invalid email address")
  .max(255, "Email must be 255 characters or less")
  .optional();

/**
 * Phone number (flexible format)
 */
export const phoneSchema = z.string()
  .min(7, "Phone number must be at least 7 characters")
  .max(20, "Phone number must be 20 characters or less")
  .regex(/^[\d\s\-+().]+$/, "Invalid phone number format");

/**
 * Optional phone number
 */
export const optionalPhoneSchema = z.string()
  .min(7, "Phone number must be at least 7 characters")
  .max(20, "Phone number must be 20 characters or less")
  .regex(/^[\d\s\-+().]+$/, "Invalid phone number format")
  .optional();

// ============================================================================
// DATE/TIME SCHEMAS
// ============================================================================

/**
 * ISO date string (YYYY-MM-DD)
 */
export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * ISO datetime string
 */
export const datetimeStringSchema = z.string()
  .datetime("Invalid datetime format");

/**
 * Time string (HH:MM or HH:MM:SS)
 */
export const timeStringSchema = z.string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format");

/**
 * Timezone string (IANA format)
 */
export const timezoneSchema = z.string()
  .min(1, "Timezone is required")
  .max(50, "Invalid timezone");

// ============================================================================
// NUMERIC SCHEMAS
// ============================================================================

/**
 * Monetary value (positive, up to 2 decimal places)
 */
export const moneySchema = z.number()
  .min(0, "Amount cannot be negative")
  .max(999999999.99, "Amount exceeds maximum allowed")
  .multipleOf(0.01, "Amount must have at most 2 decimal places");

/**
 * Percentage value (0-100)
 */
export const percentageSchema = z.number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100");

/**
 * Quantity (positive number)
 */
export const quantitySchema = z.number()
  .min(0, "Quantity cannot be negative")
  .max(999999999, "Quantity exceeds maximum allowed");

/**
 * Priority number (for ordering)
 */
export const prioritySchema = z.number()
  .int()
  .min(0, "Priority cannot be negative")
  .max(9999, "Priority exceeds maximum allowed");

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Standard pagination input
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * Extended pagination with sorting
 */
export const paginationWithSortSchema = paginationSchema.extend({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================================================
// PRICING CONDITION SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Comparison operators for pricing conditions
 */
export const comparisonOperatorSchema = z.enum([
  "eq",      // equals
  "ne",      // not equals
  "gt",      // greater than
  "lt",      // less than
  "gte",     // greater than or equal
  "lte",     // less than or equal
  "contains", // string contains
  "in",      // value in array
  "notIn",   // value not in array
  "between", // value between two numbers
]);

/**
 * Condition value - can be string, number, boolean, or array
 */
export const conditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);

/**
 * Single pricing condition
 */
export const pricingConditionSchema = z.object({
  field: z.string().min(1, "Field name is required").max(100, "Field name too long"),
  operator: comparisonOperatorSchema,
  value: conditionValueSchema,
});

/**
 * Array of pricing conditions
 */
export const pricingConditionsArraySchema = z.array(pricingConditionSchema);

/**
 * Pricing conditions as record (legacy format support)
 * Maps field names to condition objects
 */
export const pricingConditionsRecordSchema = z.record(
  z.string(),
  z.object({
    operator: comparisonOperatorSchema.optional().default("eq"),
    value: conditionValueSchema,
  })
);

/**
 * Flexible pricing conditions - supports both array and record formats
 */
export const flexiblePricingConditionsSchema = z.union([
  pricingConditionsArraySchema,
  pricingConditionsRecordSchema,
]);

// ============================================================================
// VIP PORTAL CONFIGURATION SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * VIP Portal features configuration
 */
export const vipFeaturesConfigSchema = z.object({
  showPricing: z.boolean().optional(),
  showInventoryLevels: z.boolean().optional(),
  allowOrderCreation: z.boolean().optional(),
  allowQuoteRequests: z.boolean().optional(),
  showPaymentHistory: z.boolean().optional(),
  showCreditInfo: z.boolean().optional(),
  customBranding: z.object({
    primaryColor: z.string().optional(),
    logoUrl: z.string().url().optional(),
    companyName: z.string().optional(),
  }).optional(),
}).passthrough(); // Allow additional properties for extensibility

/**
 * VIP Portal advanced options
 */
export const vipAdvancedOptionsSchema = z.object({
  sessionTimeout: z.number().int().min(5).max(1440).optional(), // minutes
  maxLoginAttempts: z.number().int().min(1).max(10).optional(),
  requireMfa: z.boolean().optional(),
  ipWhitelist: z.array(z.string()).optional(),
  customCss: z.string().max(10000).optional(),
}).passthrough();

/**
 * VIP Tier configuration
 */
export const vipTierSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  minSpend: z.number().min(0),
  maxSpend: z.number().min(0).optional(),
  discountPercent: percentageSchema.optional(),
  benefits: z.array(z.string()).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

/**
 * Array of VIP tiers
 */
export const vipTiersArraySchema = z.array(vipTierSchema);

// ============================================================================
// DASHBOARD WIDGET SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Dashboard widget configuration
 */
export const dashboardWidgetConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  refreshInterval: z.number().int().min(0).max(3600).optional(), // seconds
  showHeader: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  chartType: z.enum(["bar", "line", "pie", "donut", "area"]).optional(),
  colors: z.array(z.string()).optional(),
  dataSource: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// FREEFORM NOTES SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Rich text content (JSON from editor like TipTap/ProseMirror)
 */
export const richTextContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.object({
    type: z.string(),
    content: z.array(z.unknown()).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(z.object({
      type: z.string(),
      attrs: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
}).passthrough();

/**
 * Freeform note content - can be rich text or plain string
 */
export const noteContentSchema = z.union([
  richTextContentSchema,
  z.string(),
  z.null(),
]);

// ============================================================================
// ORDER TEMPLATE SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Order line item template
 */
export const orderLineItemTemplateSchema = z.object({
  productId: idSchema.optional(),
  batchId: idSchema.optional(),
  sku: z.string().optional(),
  quantity: quantitySchema,
  unitPrice: moneySchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Order template for recurring orders
 */
export const orderTemplateSchema = z.object({
  clientId: idSchema,
  items: z.array(orderLineItemTemplateSchema),
  notes: z.string().max(2000).optional(),
  paymentTerms: z.string().optional(),
  shippingMethod: z.string().optional(),
  discountPercent: percentageSchema.optional(),
});

// ============================================================================
// CONFIGURATION SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Configuration value - typed alternatives to z.any()
 */
export const configValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.record(z.string(), z.unknown()),
  z.null(),
]);

/**
 * Configuration object
 */
export const configObjectSchema = z.record(z.string(), configValueSchema);

// ============================================================================
// FILTER SCHEMAS (QUAL-002 Fix for z.any())
// ============================================================================

/**
 * Generic filter value
 */
export const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.null(),
]);

/**
 * Saved filter configuration
 */
export const savedFilterSchema = z.object({
  name: nameSchema,
  filters: z.record(z.string(), filterValueSchema),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
});

// ============================================================================
// MATCH SCHEMAS (QUAL-002 Fix for z.any() in clientNeedsEnhanced)
// ============================================================================

/**
 * Match record for client needs matching
 */
export const matchRecordSchema = z.object({
  id: idSchema.optional(),
  supplyId: idSchema,
  needId: idSchema.optional(),
  score: z.number().min(0).max(100).optional(),
  matchedFields: z.array(z.string()).optional(),
  status: z.enum(["pending", "accepted", "rejected", "expired"]).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Array of match records
 */
export const matchRecordsArraySchema = z.array(matchRecordSchema);

// ============================================================================
// EXPORT TYPE HELPERS
// ============================================================================

export type PricingCondition = z.infer<typeof pricingConditionSchema>;
export type PricingConditionsArray = z.infer<typeof pricingConditionsArraySchema>;
export type PricingConditionsRecord = z.infer<typeof pricingConditionsRecordSchema>;
export type VipFeaturesConfig = z.infer<typeof vipFeaturesConfigSchema>;
export type VipAdvancedOptions = z.infer<typeof vipAdvancedOptionsSchema>;
export type VipTier = z.infer<typeof vipTierSchema>;
export type DashboardWidgetConfig = z.infer<typeof dashboardWidgetConfigSchema>;
export type RichTextContent = z.infer<typeof richTextContentSchema>;
export type OrderTemplate = z.infer<typeof orderTemplateSchema>;
export type SavedFilter = z.infer<typeof savedFilterSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
