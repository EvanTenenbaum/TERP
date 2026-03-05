/**
 * Terminology Utility
 * Sprint 5.C.2: MEET-053 - User-Friendly Terminology
 *
 * This file provides consistent, user-friendly terminology throughout the app.
 * Technical terms are mapped to business-friendly language.
 */

/**
 * Terminology mappings for user-friendly display
 * Internal/Technical Term -> User-Friendly Term
 */
export const TERMINOLOGY = {
  // Batch is the canonical term
  batch: "batch",
  Batch: "Batch",
  BATCH: "BATCH",
  batches: "batches",
  Batches: "Batches",
  BATCHES: "BATCHES",
  batchId: "Batch ID",
  BatchId: "Batch ID",

  // SKU -> Product Code
  sku: "product code",
  Sku: "Product Code",
  SKU: "Product Code",
  skus: "product codes",
  Skus: "Product Codes",
  SKUS: "PRODUCT CODES",

  // COGS -> Cost
  cogs: "cost",
  Cogs: "Cost",
  COGS: "Cost",

  // Margin -> Profit
  margin: "profit margin",
  Margin: "Profit Margin",
} as const;

/**
 * Display labels for common UI elements
 */
export const UI_LABELS = {
  // Inventory
  inventoryItem: "Batch",
  inventoryItems: "Batches",
  productCode: "Product Code",
  itemId: "Batch ID",
  lotNumber: "Lot Number",

  // Pricing
  unitCost: "Unit Cost",
  unitPrice: "Unit Price",
  profitMargin: "Profit Margin",
  wholesalePrice: "Wholesale Price",
  retailPrice: "Retail Price",

  // Orders
  lineItem: "Line Item",
  lineItems: "Line Items",
  orderTotal: "Order Total",

  // Status
  inStock: "In Stock",
  outOfStock: "Out of Stock",
  lowStock: "Low Stock",

  // Actions
  addItem: "Add Item",
  removeItem: "Remove Item",
  editItem: "Edit Item",
  viewDetails: "View Details",
} as const;

/**
 * Tooltips and help text with user-friendly language
 */
export const HELP_TEXT = {
  inventoryItem: "A batch with its own tracking number and cost information.",
  productCode: "A unique identifier for the product type (formerly SKU).",
  lotNumber: "A tracking number assigned when inventory is received.",
  unitCost: "The cost paid to acquire this batch.",
  profitMargin: "The percentage of profit on the sale price after costs.",
  lowStockThreshold: "The quantity at which to trigger low stock alerts.",
} as const;

/**
 * Convert technical term to user-friendly term
 */
export function toUserFriendly(technicalTerm: string): string {
  // Handle batch/Batch/BATCH variations
  const term = technicalTerm.trim();

  // Check for exact matches first
  if (term in TERMINOLOGY) {
    return TERMINOLOGY[term as keyof typeof TERMINOLOGY];
  }

  // Handle common patterns
  let result = term;

  // "batch" and "batches" are already canonical; no replacement needed

  // Replace "SKU" variations
  result = result.replace(/\bSKU\b/g, "Product Code");
  result = result.replace(/\bsku\b/g, "product code");
  result = result.replace(/\bSku\b/g, "Product Code");

  return result;
}

/**
 * Get label for a field name
 */
export function getFieldLabel(fieldName: string): string {
  const labelMap: Record<string, string> = {
    batchId: "Batch ID",
    batchNumber: "Lot Number",
    sku: "Product Code",
    skuNumber: "Product Code",
    cogs: "Cost",
    cogsPerUnit: "Unit Cost",
    marginPercent: "Profit Margin %",
    marginDollar: "Profit Amount",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    lineTotal: "Line Total",
    subtotal: "Subtotal",
    total: "Total",
  };

  return labelMap[fieldName] || fieldName;
}

export default {
  TERMINOLOGY,
  UI_LABELS,
  HELP_TEXT,
  toUserFriendly,
  getFieldLabel,
};
