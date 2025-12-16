/**
 * Order Seeder
 *
 * Seeds the orders table with realistic order data.
 * Depends on: clients, batches
 */

import { db } from "../../db-sync";
import { orders, clients, batches } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Order Generation Utilities
// ============================================================================

type PaymentTerm = PaymentTerm;
const _PAYMENT_TERMS = ["NET_7", "NET_15", "NET_30", "COD", "CONSIGNMENT"] as const;
type SaleStatus = SaleStatus;
const _SALE_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;

interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
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
  quoteStatus: null;
  paymentTerms: PaymentTerm;
  cashPayment: string;
  dueDate: Date;
  saleStatus: SaleStatus;
  invoiceId: number | null;
  fulfillmentStatus: "PENDING" | "PACKED" | "SHIPPED";
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate order items from available batches
 */
function generateOrderItems(
  availableBatches: Array<{ id: number; unitCogs: string | null; onHandQty: string }>,
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
    
    // Quantity (0.5-50 for flower, 1-100 for other)
    const quantity = faker.number.float({ min: 0.5, max: 50, fractionDigits: 2 });
    
    const lineTotal = unitPrice * quantity;
    const lineCogs = unitCogs * quantity;
    const lineMargin = lineTotal - lineCogs;

    items.push({
      batchId: batch.id,
      displayName: `Product from Batch ${batch.id}`,
      originalName: `Product from Batch ${batch.id}`,
      quantity,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
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
 * Generate an order record
 */
function generateOrder(
  index: number,
  clientId: number,
  availableBatches: Array<{ id: number; unitCogs: string | null; onHandQty: string }>,
  isWhaleClient: boolean
): OrderData {
  // Whale clients get larger orders
  const itemCount = isWhaleClient
    ? faker.number.int({ min: 3, max: 10 })
    : faker.number.int({ min: 1, max: 5 });

  const { items, subtotal, totalCogs } = generateOrderItems(availableBatches, itemCount);
  const totalMargin = subtotal - totalCogs;
  const avgMarginPercent = (totalMargin / subtotal) * 100;

  const orderDate = faker.date.between({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const dueDate = new Date(orderDate);
  dueDate.setDate(dueDate.getDate() + 30);

  // 50% consignment
  const isConsignment = Math.random() < 0.5;
  const paymentTerms = isConsignment ? "CONSIGNMENT" : faker.helpers.arrayElement(["NET_7", "NET_15", "NET_30", "COD"]);

  // Sale status based on date
  const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  let saleStatus: SaleStatus;
  if (daysSinceOrder < 7) {
    saleStatus = "PENDING";
  } else if (daysSinceOrder > 30 && Math.random() < 0.15) {
    saleStatus = "OVERDUE";
  } else if (Math.random() < 0.3) {
    saleStatus = "PARTIAL";
  } else {
    saleStatus = "PAID";
  }

  return {
    orderNumber: `ORD-${String(index + 1).padStart(6, "0")}`,
    orderType: "SALE",
    isDraft: false,
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
    quoteStatus: null,
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

      // Get existing batches
      const existingBatches = await db
        .select({ id: batches.id, unitCogs: batches.unitCogs, onHandQty: batches.onHandQty })
        .from(batches);

      if (existingBatches.length === 0) {
        result.errors.push("No batches found. Seed batches first.");
        return result;
      }

      const records: OrderData[] = [];
      const batchSize = 20; // Smaller batch size for orders (complex JSON)

      // Generate orders: 70% from whales, 30% from regular
      for (let i = 0; i < count; i++) {
        const isWhaleOrder = Math.random() < 0.7 && whaleClients.length > 0;
        const clientPool = isWhaleOrder ? whaleClients : regularClients.length > 0 ? regularClients : existingClients;
        const client = clientPool[i % clientPool.length];

        const order = generateOrder(i, client.id, existingBatches, isWhaleOrder);

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


