/**
 * Purchase Orders Seeder
 *
 * Seeds the purchaseOrders and purchaseOrderItems tables with realistic PO data.
 * Depends on: vendors, products
 * Requirements: 7.1, 7.2, 7.3
 */

import { db } from "../../db-sync";
import { purchaseOrders, purchaseOrderItems, vendors, products } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Purchase Order Status Enum - matches schema definition
 * Requirements: 7.2
 */
type POStatus = "DRAFT" | "SENT" | "CONFIRMED" | "RECEIVING" | "RECEIVED" | "CANCELLED";

interface PurchaseOrderData {
  poNumber: string;
  vendorId: number;
  intakeSessionId: number | null;
  purchaseOrderStatus: POStatus;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  paymentTerms: string | null;
  paymentDueDate: Date | null;
  notes: string | null;
  vendorNotes: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  confirmedAt: Date | null;
}

interface POLineItemData {
  purchaseOrderId: number;
  productId: number;
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string;
  totalCost: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Purchase Order Generation Utilities
// ============================================================================

/**
 * Generate a purchase order record
 * Requirements: 7.1, 7.2
 */
function generatePurchaseOrder(
  index: number,
  vendorId: number,
  status: POStatus
): PurchaseOrderData {
  const orderDate = faker.date.between({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const expectedDeliveryDate = new Date(orderDate);
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + faker.number.int({ min: 7, max: 30 }));

  // Set actual delivery date for RECEIVED status
  let actualDeliveryDate: Date | null = null;
  if (status === "RECEIVED") {
    actualDeliveryDate = new Date(expectedDeliveryDate);
    actualDeliveryDate.setDate(actualDeliveryDate.getDate() + faker.number.int({ min: -3, max: 5 }));
  }

  // Set sent/confirmed timestamps based on status
  let sentAt: Date | null = null;
  let confirmedAt: Date | null = null;
  if (status !== "DRAFT") {
    sentAt = new Date(orderDate);
    sentAt.setDate(sentAt.getDate() + 1);
  }
  if (status === "CONFIRMED" || status === "RECEIVING" || status === "RECEIVED") {
    confirmedAt = new Date(sentAt || orderDate);
    confirmedAt.setDate(confirmedAt.getDate() + faker.number.int({ min: 1, max: 3 }));
  }

  // Generate amounts (will be updated after line items are created)
  const subtotal = faker.number.float({ min: 1000, max: 100000, fractionDigits: 2 });
  const tax = subtotal * faker.number.float({ min: 0, max: 0.1, fractionDigits: 4 });
  const shipping = Math.random() < 0.3 ? faker.number.float({ min: 50, max: 500, fractionDigits: 2 }) : 0;
  const total = subtotal + tax + shipping;

  const paymentDueDate = new Date(orderDate);
  paymentDueDate.setDate(paymentDueDate.getDate() + 30);

  return {
    poNumber: `PO-${String(index + 1).padStart(6, "0")}`,
    vendorId,
    intakeSessionId: null,
    purchaseOrderStatus: status,
    orderDate,
    expectedDeliveryDate,
    actualDeliveryDate,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2),
    paymentTerms: faker.helpers.arrayElement(["NET_30", "NET_15", "NET_7", "COD", null]),
    paymentDueDate,
    notes: Math.random() < 0.3 ? faker.lorem.sentence() : null,
    vendorNotes: Math.random() < 0.2 ? faker.lorem.sentence() : null,
    createdBy: 1,
    createdAt: orderDate,
    updatedAt: orderDate,
    sentAt,
    confirmedAt,
  };
}

/**
 * Generate purchase order line items
 * Requirements: 7.3
 */
function generatePOLineItems(
  purchaseOrderId: number,
  productIds: number[],
  status: POStatus,
  totalAmount: number
): POLineItemData[] {
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const items: POLineItemData[] = [];
  let remainingAmount = totalAmount;

  for (let i = 0; i < itemCount; i++) {
    const isLastItem = i === itemCount - 1;
    const productId = productIds[i % productIds.length];
    
    // Calculate line amount
    const lineAmount = isLastItem 
      ? remainingAmount 
      : remainingAmount * faker.number.float({ min: 0.1, max: 0.5 });
    remainingAmount -= lineAmount;

    const quantityOrdered = faker.number.float({ min: 10, max: 500, fractionDigits: 2 });
    const unitCost = lineAmount / quantityOrdered;

    // Calculate quantity received based on status
    let quantityReceived = 0;
    if (status === "RECEIVED") {
      quantityReceived = quantityOrdered;
    } else if (status === "RECEIVING") {
      quantityReceived = quantityOrdered * faker.number.float({ min: 0.3, max: 0.8 });
    }

    items.push({
      purchaseOrderId,
      productId,
      quantityOrdered: quantityOrdered.toFixed(4),
      quantityReceived: quantityReceived.toFixed(4),
      unitCost: unitCost.toFixed(4),
      totalCost: lineAmount.toFixed(4),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return items;
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed purchase orders table
 * Requirements: 7.1, 7.2, 7.3
 */
export async function seedPurchaseOrders(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("purchaseOrders");
  const startTime = Date.now();

  return withPerformanceLogging("seed:purchaseOrders", async () => {
    try {
      seedLogger.tableSeeding("purchaseOrders", count);

      // Get existing vendors
      const existingVendors = await db.select({ id: vendors.id }).from(vendors);
      if (existingVendors.length === 0) {
        result.errors.push("Warning: No vendors found. Skipping purchase orders seeder.");
        seedLogger.operationProgress("seed:purchaseOrders", 0, count);
        return result;
      }
      const vendorIds = existingVendors.map(v => v.id);

      // Get existing products
      const existingProducts = await db.select({ id: products.id }).from(products);
      if (existingProducts.length === 0) {
        result.errors.push("Warning: No products found. Skipping purchase orders seeder.");
        seedLogger.operationProgress("seed:purchaseOrders", 0, count);
        return result;
      }
      const productIds = existingProducts.map(p => p.id);

      // Status distribution (Requirements 7.2)
      const statusDistribution: POStatus[] = [
        "DRAFT", "DRAFT",
        "SENT", "SENT",
        "CONFIRMED", "CONFIRMED", "CONFIRMED",
        "RECEIVING",
        "RECEIVED", "RECEIVED", "RECEIVED", "RECEIVED",
        "CANCELLED",
      ];

      const poRecords: PurchaseOrderData[] = [];

      // Generate purchase orders
      for (let i = 0; i < count; i++) {
        const vendorId = vendorIds[i % vendorIds.length];
        const status = statusDistribution[i % statusDistribution.length];

        const po = generatePurchaseOrder(i, vendorId, status);
        poRecords.push(po);
      }

      // Insert purchase orders
      const insertedPOs: { insertId: number }[] = [];
      for (const po of poRecords) {
        const [inserted] = await db.insert(purchaseOrders).values(po);
        insertedPOs.push(inserted);
        result.inserted++;
      }

      // Generate and insert line items for each PO (Requirements 7.3)
      for (let i = 0; i < insertedPOs.length; i++) {
        const poId = insertedPOs[i].insertId;
        const po = poRecords[i];
        const lineItems = generatePOLineItems(
          poId,
          productIds,
          po.purchaseOrderStatus,
          parseFloat(po.subtotal)
        );

        if (lineItems.length > 0) {
          await db.insert(purchaseOrderItems).values(lineItems);
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("purchaseOrders", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:purchaseOrders",
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

export type { PurchaseOrderData, POLineItemData, POStatus };
export { generatePurchaseOrder, generatePOLineItems };
