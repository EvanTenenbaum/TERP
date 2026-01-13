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
  // Batch -> Inventory Item
  batch: "inventory item",
  Batch: "Inventory Item",
  BATCH: "INVENTORY ITEM",
  batches: "inventory items",
  Batches: "Inventory Items",
  BATCHES: "INVENTORY ITEMS",
  batchId: "Item ID",
  BatchId: "Item ID",

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
  inventoryItem: "Inventory Item",
  inventoryItems: "Inventory Items",
  productCode: "Product Code",
  itemId: "Item ID",
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
  inventoryItem:
    "A specific inventory item with its own tracking number and cost information.",
  productCode: "A unique identifier for the product type (formerly SKU).",
  lotNumber: "A tracking number assigned when inventory is received.",
  unitCost: "The cost paid to acquire this inventory item.",
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

  // Replace "batch" variations (case-insensitive, whole word)
  result = result.replace(/\bbatch\b/gi, match => {
    if (match === "BATCH") return "INVENTORY ITEM";
    if (match === "Batch") return "Inventory Item";
    return "inventory item";
  });

  // Replace "batches" variations (case-insensitive, whole word)
  result = result.replace(/\bbatches\b/gi, match => {
    if (match === "BATCHES") return "INVENTORY ITEMS";
    if (match === "Batches") return "Inventory Items";
    return "inventory items";
  });

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
    batchId: "Item ID",
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
