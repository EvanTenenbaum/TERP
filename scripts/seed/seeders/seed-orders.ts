/**
 * Order Seeder
 *
 * Seeds the orders table with realistic order data.
 * Depends on: clients, batches
 */

import { db } from "../../db-sync";
import { orders, clients, batches, products, strains } from "../../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Order Generation Utilities
// ============================================================================

type PaymentTerm = "NET_7" | "NET_15" | "NET_30" | "COD" | "CONSIGNMENT";
type SaleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

interface OrderItem {
  batchId: number;
  productId: number;
  displayName: string;
  originalName: string;
  // Product metadata for purchase history analysis
  strain: string | null;
  category: string;
  subcategory: string | null;
  grade: string | null;
  // Pricing (include both field names for compatibility)
  quantity: number;
  unitPrice: number;
  price: number; // Alias for unitPrice for compatibility with analyzeClientPurchaseHistory
  isSample: boolean;
  unitCogs: number;
  cogsMode: "FIXED" | "RANGE";
  cogsSource: "FIXED" | "MIDPOINT" | "CLIENT_ADJUSTMENT" | "RULE" | "MANUAL";
  unitMargin: number;
  marginPercent: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
}

/**
 * Batch data with product metadata for order item generation
 * Requirements: 1.1, 3.1, 3.2, 3.3, 3.4
 */
interface BatchWithMetadata {
  id: number;
  productId: number;
  unitCogs: string | null;
  onHandQty: string;
  grade: string | null;
  // Product fields (with fallbacks for missing data)
  productName: string;
  category: string;
  subcategory: string | null;
  strainId: number | null;
  // Strain fields (populated if strainId exists)
  strainName: string | null;
}

/**
 * Raw batch query result before applying fallbacks
 */
interface RawBatchQueryResult {
  id: number;
  productId: number;
  unitCogs: string | null;
  onHandQty: string;
  grade: string | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  strainId: number | null;
  strainName: string | null;
}

interface OrderData {
  orderNumber: string;
  orderType: "QUOTE" | "SALE";
  isDraft: boolean;
  clientId: number;
  clientNeedId: number | null;
  items: OrderItem[];
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  totalCogs: string;
  totalMargin: string;
  avgMarginPercent: string;
  validUntil: Date | null;
  quoteStatus: "DRAFT" | null;
  paymentTerms: PaymentTerm;
  cashPayment: string;
  dueDate: Date;
  saleStatus: SaleStatus | null;
  invoiceId: number | null;
  fulfillmentStatus: "PENDING" | "PACKED" | "SHIPPED";
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate order items from available batches with product metadata
 * Requirements: 1.1, 3.1, 3.2, 3.3, 3.4
 */
function generateOrderItems(
  availableBatches: BatchWithMetadata[],
  itemCount: number
): { items: OrderItem[]; subtotal: number; totalCogs: number } {
  const items: OrderItem[] = [];
  let subtotal = 0;
  let totalCogs = 0;

  for (let i = 0; i < itemCount; i++) {
    const batch = availableBatches[i % availableBatches.length];
    const unitCogs = parseFloat(batch.unitCogs || "100");
    
    // Calculate margin (15-35%)
    const marginPercent = faker.number.float({ min: 15, max: 35, fractionDigits: 2 });
    const unitPrice = unitCogs / (1 - marginPercent / 100);
    const price = parseFloat(unitPrice.toFixed(2)); // Alias for compatibility
    
    // Quantity (0.5-50 for flower, 1-100 for other)
    const quantity = faker.number.float({ min: 0.5, max: 50, fractionDigits: 2 });
    
    const lineTotal = unitPrice * quantity;
    const lineCogs = unitCogs * quantity;
    const lineMargin = lineTotal - lineCogs;

    // Determine display name: prefer strain name, fallback to category, then product name
    const displayName = batch.strainName || batch.category || batch.productName;

    items.push({
      batchId: batch.id,
      productId: batch.productId,
      displayName,
      originalName: batch.productName,
      // Product metadata for purchase history analysis (Requirements 1.1, 3.1, 3.2, 3.3, 3.4)
      strain: batch.strainName,
      category: batch.category,
      subcategory: batch.subcategory,
      grade: batch.grade,
      // Pricing (include both field names for compatibility - Requirement 2.1)
      quantity,
      unitPrice: price,
      price, // Alias for unitPrice for compatibility with analyzeClientPurchaseHistory
      isSample: false,
      unitCogs,
      cogsMode: "FIXED",
      cogsSource: "FIXED",
      unitMargin: parseFloat((unitPrice - unitCogs).toFixed(2)),
      marginPercent,
      lineTotal: parseFloat(lineTotal.toFixed(2)),
      lineCogs: parseFloat(lineCogs.toFixed(2)),
      lineMargin: parseFloat(lineMargin.toFixed(2)),
    });

    subtotal += lineTotal;
    totalCogs += lineCogs;
  }

  return { items, subtotal, totalCogs };
}

/**
 * Order generation options
 */
interface GenerateOrderOptions {
  isDraft?: boolean;
  isToday?: boolean;
}

/**
 * Generate an order record with product metadata
 * Requirements: 5.1, 5.2, 8.1, 8.2
 */
function generateOrder(
  index: number,
  clientId: number,
  availableBatches: BatchWithMetadata[],
  isWhaleClient: boolean,
  options: GenerateOrderOptions = {}
): OrderData {
  const { isDraft = false, isToday = false } = options;

  // Whale clients get larger orders
  const itemCount = isWhaleClient
    ? faker.number.int({ min: 3, max: 10 })
    : faker.number.int({ min: 1, max: 5 });

  const { items, subtotal, totalCogs } = generateOrderItems(availableBatches, itemCount);
  const totalMargin = subtotal - totalCogs;
  const avgMarginPercent = (totalMargin / subtotal) * 100;

  // Order date: today if isToday, otherwise random date in past year
  let orderDate: Date;
  if (isToday) {
    // Today's date with random time (Requirements 8.1, 8.2)
    const now = new Date();
    orderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    orderDate.setHours(faker.number.int({ min: 8, max: 17 }));
    orderDate.setMinutes(faker.number.int({ min: 0, max: 59 }));
  } else {
    orderDate = faker.date.between({
      from: new Date(2024, 0, 1),
      to: new Date(),
    });
  }

  const dueDate = new Date(orderDate);
  dueDate.setDate(dueDate.getDate() + 30);

  // 50% consignment
  const isConsignment = Math.random() < 0.5;
  const paymentTerms = isConsignment ? "CONSIGNMENT" : faker.helpers.arrayElement(["NET_7", "NET_15", "NET_30", "COD"]);

  // Sale status: null for drafts, otherwise based on date (Requirements 5.1, 5.2)
  let saleStatus: SaleStatus | null;
  if (isDraft) {
    saleStatus = null;
  } else {
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceOrder < 7) {
      saleStatus = "PENDING";
    } else if (daysSinceOrder > 30 && Math.random() < 0.15) {
      saleStatus = "OVERDUE";
    } else if (Math.random() < 0.3) {
      saleStatus = "PARTIAL";
    } else {
      saleStatus = "PAID";
    }
  }

  return {
    orderNumber: `ORD-${String(index + 1).padStart(6, "0")}`,
    orderType: isDraft ? "QUOTE" : "SALE",
    isDraft,
    clientId,
    clientNeedId: null,
    items,
    subtotal: subtotal.toFixed(2),
    tax: "0.00",
    discount: "0.00",
    total: subtotal.toFixed(2),
    totalCogs: totalCogs.toFixed(2),
    totalMargin: totalMargin.toFixed(2),
    avgMarginPercent: avgMarginPercent.toFixed(2),
    validUntil: null,
    quoteStatus: isDraft ? "DRAFT" : null, // Requirements 5.1, 5.2
    paymentTerms,
    cashPayment: "0.00",
    dueDate,
    saleStatus,
    invoiceId: null,
    fulfillmentStatus: faker.helpers.arrayElement(["PENDING", "PACKED", "SHIPPED"]),
    createdBy: 1,
    createdAt: orderDate,
    updatedAt: orderDate,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed orders table
 */
export async function seedOrders(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("orders");
  const startTime = Date.now();

  return withPerformanceLogging("seed:orders", async () => {
    try {
      seedLogger.tableSeeding("orders", count);

      // Get existing clients
      const existingClients = await db
        .select({ id: clients.id, teriCode: clients.teriCode })
        .from(clients);

      if (existingClients.length === 0) {
        result.errors.push("No clients found. Seed clients first.");
        return result;
      }

      // Separate whale and regular clients
      const whaleClients = existingClients.filter((c) => c.teriCode?.startsWith("WHL"));
      const regularClients = existingClients.filter((c) => !c.teriCode?.startsWith("WHL") && !c.teriCode?.startsWith("VND"));

      // Get existing batches with product metadata (Requirements 1.1, 3.1, 3.2, 3.3, 3.4)
      // Query products first to check if data exists
      const productCount = await db.select({ count: sql<number>`count(*)` }).from(products);
      const hasProducts = productCount[0]?.count > 0;

      if (!hasProducts) {
        seedLogger.operationProgress("seed:orders", 0, count);
        result.errors.push("Warning: No products found. Order items will have limited metadata.");
      }

      // Query batches with LEFT JOIN to products and strains for metadata enrichment
      const batchesWithMetadata: RawBatchQueryResult[] = await db
        .select({
          id: batches.id,
          productId: batches.productId,
          unitCogs: batches.unitCogs,
          onHandQty: batches.onHandQty,
          grade: batches.grade,
          // Product fields
          productName: products.nameCanonical,
          category: products.category,
          subcategory: products.subcategory,
          strainId: products.strainId,
          // Strain name (will be null if no strain)
          strainName: strains.name,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(strains, eq(products.strainId, strains.id));

      if (batchesWithMetadata.length === 0) {
        result.errors.push("No batches found. Seed batches first.");
        return result;
      }

      // Filter out batches with missing product data and provide fallbacks
      const existingBatches: BatchWithMetadata[] = batchesWithMetadata.map(b => ({
        id: b.id,
        productId: b.productId,
        unitCogs: b.unitCogs,
        onHandQty: b.onHandQty,
        grade: b.grade,
        productName: b.productName || "Unknown Product",
        category: b.category || "Uncategorized",
        subcategory: b.subcategory,
        strainId: b.strainId,
        strainName: b.strainName,
      }));

      const records: OrderData[] = [];
      const batchSize = 20; // Smaller batch size for orders (complex JSON)

      // Calculate order distribution (Requirements 5.1, 5.2, 8.1, 8.2)
      // 10-15% draft orders, 3-5 today's orders, rest are regular orders
      const draftCount = Math.floor(count * 0.12); // ~12% drafts
      const todayCount = Math.min(5, Math.max(3, Math.floor(count * 0.01))); // 3-5 today's orders
      const regularCount = count - draftCount - todayCount;

      let orderIndex = 0;

      // Generate regular orders: 70% from whales, 30% from regular
      for (let i = 0; i < regularCount; i++) {
        const isWhaleOrder = Math.random() < 0.7 && whaleClients.length > 0;
        const clientPool = isWhaleOrder ? whaleClients : regularClients.length > 0 ? regularClients : existingClients;
        const client = clientPool[i % clientPool.length];

        const order = generateOrder(orderIndex++, client.id, existingBatches, isWhaleOrder);

        // Validate (skip items validation as it's JSON)
        const orderForValidation = { ...order, items: JSON.stringify(order.items) };
        const validation = await validator.validateColumns("orders", orderForValidation);
        if (!validation.valid) {
          // Filter out items-related errors (JSON field)
          const realErrors = validation.errors.filter((e) => !e.field.includes("items"));
          if (realErrors.length > 0) {
            result.errors.push(
              `Order ${i}: ${realErrors.map((e) => e.message).join(", ")}`
            );
            result.skipped++;
            continue;
          }
        }

        records.push(order);
      }

      // Generate draft orders (Requirements 5.1, 5.2)
      for (let i = 0; i < draftCount; i++) {
        const clientPool = regularClients.length > 0 ? regularClients : existingClients;
        const client = clientPool[i % clientPool.length];

        const order = generateOrder(orderIndex++, client.id, existingBatches, false, { isDraft: true });
        records.push(order);
      }

      // Generate today's orders distributed across different clients (Requirements 8.1, 8.2)
      for (let i = 0; i < todayCount; i++) {
        // Use different clients for each today's order
        const clientPool = existingClients;
        const client = clientPool[i % clientPool.length];

        const order = generateOrder(orderIndex++, client.id, existingBatches, false, { isToday: true });
        records.push(order);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(orders).values(batch);
        result.inserted += batch.length;

        if (count > 50 && (i + batchSize) % 50 === 0) {
          seedLogger.operationProgress(
            "seed:orders",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("orders", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:orders",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}



// ============================================================================
// Exports for Testing
// ============================================================================

// Export types for property-based testing
export type { OrderItem, BatchWithMetadata, OrderData, GenerateOrderOptions };

// Export pure functions for property-based testing
export { generateOrderItems, generateOrder };
