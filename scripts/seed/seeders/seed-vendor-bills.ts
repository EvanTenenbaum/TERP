/**
 * Vendor Bills Seeder
 *
 * Seeds the bills and billLineItems tables with realistic vendor bill data.
 * Depends on: vendors, lots, products
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { db } from "../../db-sync";
import { bills, billLineItems, vendors, lots, products, payments } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Bill Status Enum - matches schema definition
 * Requirements: 6.2
 */
type BillStatus = "DRAFT" | "PENDING" | "APPROVED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";

interface BillData {
  billNumber: string;
  vendorId: number;
  billDate: Date;
  dueDate: Date;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: BillStatus;
  paymentTerms: string | null;
  notes: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BillLineItemData {
  billId: number;
  productId: number | null;
  lotId: number | null;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountPercent: string;
  lineTotal: string;
  createdAt: Date;
}

interface PaymentData {
  paymentNumber: string;
  paymentType: "SENT";
  paymentDate: Date;
  amount: string;
  paymentMethod: "CASH" | "CHECK" | "WIRE" | "ACH" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  referenceNumber: string | null;
  bankAccountId: number | null;
  customerId: number | null;
  vendorId: number;
  invoiceId: number | null;
  billId: number;
  notes: string | null;
  isReconciled: boolean;
  reconciledAt: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Bill Generation Utilities
// ============================================================================

/**
 * Generate a bill record
 * Requirements: 6.1, 6.2
 */
function generateBill(
  index: number,
  vendorId: number,
  lotId: number | null,
  status: BillStatus
): BillData {
  const billDate = faker.date.between({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const dueDate = new Date(billDate);
  dueDate.setDate(dueDate.getDate() + 30);

  // Generate amounts
  const subtotal = faker.number.float({ min: 500, max: 50000, fractionDigits: 2 });
  const taxRate = faker.number.float({ min: 0, max: 0.1, fractionDigits: 4 });
  const taxAmount = subtotal * taxRate;
  const discountAmount = Math.random() < 0.2 ? subtotal * 0.05 : 0;
  const totalAmount = subtotal + taxAmount - discountAmount;

  // Calculate paid amount based on status
  let amountPaid = 0;
  if (status === "PAID") {
    amountPaid = totalAmount;
  } else if (status === "PARTIAL") {
    amountPaid = totalAmount * faker.number.float({ min: 0.2, max: 0.8 });
  }
  const amountDue = Math.max(0, totalAmount - amountPaid);

  return {
    billNumber: `BILL-${String(index + 1).padStart(6, "0")}`,
    vendorId,
    billDate,
    dueDate,
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    amountDue: amountDue.toFixed(2),
    status,
    paymentTerms: faker.helpers.arrayElement(["NET_30", "NET_15", "NET_7", "COD", null]),
    notes: Math.random() < 0.3 ? faker.lorem.sentence() : null,
    referenceType: lotId ? "LOT" : null,
    referenceId: lotId,
    createdBy: 1,
    createdAt: billDate,
    updatedAt: billDate,
  };
}

/**
 * Generate bill line items
 * Requirements: 6.3
 */
function generateBillLineItems(
  billId: number,
  productIds: number[],
  lotId: number | null,
  totalAmount: number
): BillLineItemData[] {
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const items: BillLineItemData[] = [];
  let remainingAmount = totalAmount;

  for (let i = 0; i < itemCount; i++) {
    const isLastItem = i === itemCount - 1;
    const productId = productIds.length > 0 ? productIds[i % productIds.length] : null;
    
    // Calculate line amount
    const lineAmount = isLastItem 
      ? remainingAmount 
      : remainingAmount * faker.number.float({ min: 0.1, max: 0.5 });
    remainingAmount -= lineAmount;

    const quantity = faker.number.float({ min: 1, max: 100, fractionDigits: 2 });
    const unitPrice = lineAmount / quantity;

    items.push({
      billId,
      productId,
      lotId: i === 0 ? lotId : null, // Link first item to lot
      description: faker.commerce.productName(),
      quantity: quantity.toFixed(2),
      unitPrice: unitPrice.toFixed(2),
      taxRate: "0.00",
      discountPercent: "0.00",
      lineTotal: lineAmount.toFixed(2),
      createdAt: new Date(),
    });
  }

  return items;
}

/**
 * Generate a payment for a bill
 * Requirements: 6.4
 */
function generateBillPayment(
  index: number,
  billId: number,
  vendorId: number,
  amount: number,
  paymentDate: Date
): PaymentData {
  return {
    paymentNumber: `PAY-${String(index + 1).padStart(6, "0")}`,
    paymentType: "SENT",
    paymentDate,
    amount: amount.toFixed(2),
    paymentMethod: faker.helpers.arrayElement(["CASH", "CHECK", "WIRE", "ACH"]),
    referenceNumber: Math.random() < 0.5 ? faker.string.alphanumeric(10).toUpperCase() : null,
    bankAccountId: null,
    customerId: null,
    vendorId,
    invoiceId: null,
    billId,
    notes: null,
    isReconciled: Math.random() < 0.3,
    reconciledAt: null,
    createdBy: 1,
    createdAt: paymentDate,
    updatedAt: paymentDate,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed vendor bills table
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export async function seedVendorBills(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("bills");
  const startTime = Date.now();

  return withPerformanceLogging("seed:bills", async () => {
    try {
      seedLogger.tableSeeding("bills", count);

      // Get existing vendors
      const existingVendors = await db.select({ id: vendors.id }).from(vendors);
      if (existingVendors.length === 0) {
        result.errors.push("Warning: No vendors found. Skipping vendor bills seeder.");
        seedLogger.operationProgress("seed:bills", 0, count);
        return result;
      }
      const vendorIds = existingVendors.map(v => v.id);

      // Get existing lots (optional - bills can exist without lots)
      const existingLots = await db.select({ id: lots.id }).from(lots);
      const lotIds = existingLots.map(l => l.id);
      const hasLots = lotIds.length > 0;

      if (!hasLots) {
        seedLogger.operationProgress("seed:bills", 0, count);
        result.errors.push("Warning: No lots found. Bills will be created without lot references.");
      }

      // Get existing products for line items
      const existingProducts = await db.select({ id: products.id }).from(products);
      const productIds = existingProducts.map(p => p.id);

      // Status distribution (Requirements 6.2)
      const statusDistribution: BillStatus[] = [
        "DRAFT", "DRAFT",
        "PENDING", "PENDING", "PENDING",
        "APPROVED", "APPROVED",
        "PARTIAL", "PARTIAL",
        "PAID", "PAID", "PAID", "PAID",
        "OVERDUE",
      ];

      const billRecords: BillData[] = [];
      let paymentIndex = 0;

      // Generate bills
      for (let i = 0; i < count; i++) {
        const vendorId = vendorIds[i % vendorIds.length];
        const lotId = hasLots ? lotIds[i % lotIds.length] : null;
        const status = statusDistribution[i % statusDistribution.length];

        const bill = generateBill(i, vendorId, lotId, status);
        billRecords.push(bill);
      }

      // Insert bills
      const insertedBills: { insertId: number }[] = [];
      for (const bill of billRecords) {
        const [inserted] = await db.insert(bills).values(bill);
        insertedBills.push(inserted);
        result.inserted++;
      }

      // Generate and insert line items for each bill (Requirements 6.3)
      for (let i = 0; i < insertedBills.length; i++) {
        const billId = insertedBills[i].insertId;
        const bill = billRecords[i];
        const lineItems = generateBillLineItems(
          billId,
          productIds,
          bill.referenceId,
          parseFloat(bill.subtotal)
        );

        if (lineItems.length > 0) {
          await db.insert(billLineItems).values(lineItems);
        }
      }

      // Generate payments for PAID and PARTIAL bills (Requirements 6.4)
      for (let i = 0; i < insertedBills.length; i++) {
        const billId = insertedBills[i].insertId;
        const bill = billRecords[i];

        if (bill.status === "PAID" || bill.status === "PARTIAL") {
          const amountPaid = parseFloat(bill.amountPaid);
          if (amountPaid > 0) {
            const payment = generateBillPayment(
              paymentIndex++,
              billId,
              bill.vendorId,
              amountPaid,
              bill.billDate
            );
            await db.insert(payments).values(payment);
          }
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("bills", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:bills",
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

export type { BillData, BillLineItemData, BillStatus };
export { generateBill, generateBillLineItems, generateBillPayment };
