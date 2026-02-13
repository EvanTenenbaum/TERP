/**
 * Procure-to-Pay Cascade Generator
 *
 * This module generates the complete Procure-to-Pay flow with operational coherence:
 * - Purchase Orders → PO Items
 * - Intake Sessions → Lots → Batches → Inventory Movements
 * - Vendor Bills → Bill Line Items → Ledger Entries
 * - Vendor Payments → Payment History → Bank Transactions
 * - Vendor Notes and Activity
 *
 * This ensures vendor-side transactions are as coherent as customer-side transactions.
 */

import type { BatchData } from "./inventory.js";
import { CONFIG } from "./config.js";
import { faker } from "@faker-js/faker";

export interface PurchaseOrderData {
  id?: number;
  poNumber: string;
  vendorId: number;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  notes?: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItemData {
  id?: number;
  purchaseOrderId?: number;
  productId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  receivedQuantity?: string;
  createdAt: Date;
}

export interface IntakeSessionData {
  id?: number;
  vendorId: number;
  sessionDate: Date;
  totalWeight: string;
  notes?: string;
  createdBy: number;
  createdAt: Date;
}

export interface IntakeSessionBatchData {
  intakeSessionId?: number;
  batchId?: number;
}

export interface BillData {
  id?: number;
  billNumber: string;
  vendorId: number;
  billDate: Date;
  dueDate: Date;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillLineItemData {
  id?: number;
  billId?: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  createdAt: Date;
}

export interface VendorPaymentData {
  id?: number;
  paymentNumber: string;
  vendorId: number;
  amount: string;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorNoteData {
  id?: number;
  vendorId: number;
  userId: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcureToPayCascadeResult {
  purchaseOrders: PurchaseOrderData[];
  purchaseOrderItems: PurchaseOrderItemData[];
  intakeSessions: IntakeSessionData[];
  intakeSessionBatches: IntakeSessionBatchData[];
  batchStatusHistory: Array<{
    batchId?: number;
    previousStatus?: string;
    newStatus: string;
    changedBy: number;
    notes?: string;
    createdAt: Date;
  }>;
  bills: BillData[];
  billLineItems: BillLineItemData[];
  vendorPayments: VendorPaymentData[];
  ledgerEntries: Array<{
    accountId: number;
    transactionDate: Date;
    description: string;
    debit: string;
    credit: string;
    referenceType: string;
    referenceId?: number;
    createdAt: Date;
  }>;
  vendorNotes: VendorNoteData[];
}

/**
 * Generate complete Procure-to-Pay cascade for existing lots and batches
 */
export function generateProcureToPayCascade(
  lots: Array<{ id: number; vendorId: number; receivedDate: Date; totalWeight: string }>,
  batches: BatchData[],
  vendorIds: number[]
): ProcureToPayCascadeResult {
  const purchaseOrders: PurchaseOrderData[] = [];
  const purchaseOrderItems: PurchaseOrderItemData[] = [];
  const intakeSessions: IntakeSessionData[] = [];
  const intakeSessionBatches: IntakeSessionBatchData[] = [];
  const batchStatusHistory: Array<{
    batchId?: number;
    previousStatus?: string;
    newStatus: string;
    changedBy: number;
    notes?: string;
    createdAt: Date;
  }> = [];
  const bills: BillData[] = [];
  const billLineItems: BillLineItemData[] = [];
  const vendorPayments: VendorPaymentData[] = [];
  const ledgerEntries: Array<{
    accountId: number;
    transactionDate: Date;
    description: string;
    debit: string;
    credit: string;
    referenceType: string;
    referenceId?: number;
    createdAt: Date;
  }> = [];
  const vendorNotes: VendorNoteData[] = [];

  // Group lots by vendor and date
  const lotsByVendor = new Map<number, typeof lots>();
  for (const lot of lots) {
    let vendorLots = lotsByVendor.get(lot.vendorId);
    if (!vendorLots) {
      vendorLots = [];
      lotsByVendor.set(lot.vendorId, vendorLots);
    }
    vendorLots.push(lot);
  }

  let poCounter = 1;
  let billCounter = 1;
  let paymentCounter = 1;
  let sessionCounter = 1;

  // For each vendor, create POs, intake sessions, and bills
  for (const [vendorId, vendorLots] of lotsByVendor) {
    // Sort lots by date (handle missing receivedDate)
    vendorLots.sort((a, b) => {
      const aDate = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
      const bDate = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
      return aDate - bDate;
    });

    // Group lots into intake sessions (roughly one session per 2-3 lots)
    const sessionsPerVendor = Math.ceil(vendorLots.length / 2.5);

    for (let i = 0; i < sessionsPerVendor; i++) {
      const sessionLots = vendorLots.slice(
        Math.floor((i / sessionsPerVendor) * vendorLots.length),
        Math.floor(((i + 1) / sessionsPerVendor) * vendorLots.length)
      );

      if (sessionLots.length === 0) continue;

      const sessionDate = sessionLots[0].receivedDate;

      // Create Purchase Order (created 7-14 days before intake)
      const poDate = new Date(sessionDate);
      poDate.setDate(poDate.getDate() - (7 + Math.floor(Math.random() * 7)));

      const expectedDeliveryDate = new Date(sessionDate);

      // Calculate PO total from lots
      const poTotal = sessionLots.reduce(
        (sum, lot) => sum + parseFloat(lot.totalWeight) * 1000, // Assume $1000/lb average
        0
      );

      const po: PurchaseOrderData = {
        poNumber: `PO-${String(poCounter++).padStart(6, "0")}`,
        vendorId,
        orderDate: poDate,
        expectedDeliveryDate,
        status: "RECEIVED",
        subtotal: poTotal.toFixed(2),
        taxAmount: "0.00",
        total: poTotal.toFixed(2),
        notes: `Purchase order for ${sessionLots.length} lot(s)`,
        createdBy: 1,
        createdAt: poDate,
        updatedAt: sessionDate,
      };
      purchaseOrders.push(po);

      // Create PO Items
      for (const lot of sessionLots) {
        const itemTotal = parseFloat(lot.totalWeight) * 1000;
        purchaseOrderItems.push({
          description: `Lot ${lot.id} - ${lot.totalWeight} lbs`,
          quantity: lot.totalWeight,
          unitPrice: "1000.00",
          lineTotal: itemTotal.toFixed(2),
          receivedQuantity: lot.totalWeight,
          createdAt: poDate,
        });
      }

      // Create Intake Session
      const totalWeight = sessionLots.reduce(
        (sum, lot) => sum + parseFloat(lot.totalWeight),
        0
      );

      const intakeSession: IntakeSessionData = {
        vendorId,
        sessionDate,
        totalWeight: totalWeight.toFixed(2),
        notes: `Received ${sessionLots.length} lot(s) from PO ${po.poNumber}`,
        createdBy: 1,
        createdAt: sessionDate,
      };
      intakeSessions.push(intakeSession);

      // Link batches to intake session
      const sessionBatches = batches.filter((b) =>
        sessionLots.some((lot) => lot.id === b.lotId)
      );

      for (const batch of sessionBatches) {
        intakeSessionBatches.push({
          // Will be set after insertion
        });

        // Create batch status history
        batchStatusHistory.push({
          batchId: batch.id,
          previousStatus: undefined,
          newStatus: "AWAITING_INTAKE",
          changedBy: 1,
          notes: "Batch created",
          createdAt: new Date(sessionDate.getTime() - 1000),
        });

        batchStatusHistory.push({
          batchId: batch.id,
          previousStatus: "AWAITING_INTAKE",
          newStatus: "LIVE",
          changedBy: 1,
          notes: `Received via intake session`,
          createdAt: sessionDate,
        });
      }

      // Create Vendor Bill (for non-consignment)
      const isConsignment = Math.random() < 0.9; // 90% consignment
      if (!isConsignment) {
        const billDate = new Date(sessionDate);
        billDate.setDate(billDate.getDate() + Math.floor(Math.random() * 3));

        const dueDate = new Date(billDate);
        dueDate.setDate(dueDate.getDate() + 30); // NET_30

        const bill: BillData = {
          billNumber: `BILL-${String(billCounter++).padStart(6, "0")}`,
          vendorId,
          billDate,
          dueDate,
          status: "PENDING",
          subtotal: poTotal.toFixed(2),
          taxAmount: "0.00",
          total: poTotal.toFixed(2),
          createdAt: billDate,
          updatedAt: billDate,
        };
        bills.push(bill);

        // Create Bill Line Items
        for (const lot of sessionLots) {
          const itemTotal = parseFloat(lot.totalWeight) * 1000;
          billLineItems.push({
            description: `Lot ${lot.id} - ${lot.totalWeight} lbs`,
            quantity: lot.totalWeight,
            unitPrice: "1000.00",
            lineTotal: itemTotal.toFixed(2),
            createdAt: billDate,
          });
        }

        // Create Ledger Entries for Bill
        ledgerEntries.push(
          {
            accountId: 5, // Inventory
            transactionDate: billDate,
            description: `Bill ${bill.billNumber} - Inventory`,
            debit: poTotal.toFixed(2),
            credit: "0.00",
            referenceType: "BILL",
            createdAt: billDate,
          },
          {
            accountId: 6, // Accounts Payable
            transactionDate: billDate,
            description: `Bill ${bill.billNumber} - AP`,
            debit: "0.00",
            credit: poTotal.toFixed(2),
            referenceType: "BILL",
            createdAt: billDate,
          }
        );

        // Create Vendor Payment (80% of bills are paid)
        if (Math.random() < 0.8) {
          const paymentDate = new Date(billDate);
          paymentDate.setDate(paymentDate.getDate() + (1 + Math.floor(Math.random() * 25)));

          const payment: VendorPaymentData = {
            paymentNumber: `VPAY-${String(paymentCounter++).padStart(6, "0")}`,
            vendorId,
            amount: poTotal.toFixed(2),
            paymentDate,
            paymentMethod: Math.random() < 0.7 ? "ACH" : "CHECK",
            notes: `Payment for bill ${bill.billNumber}`,
            createdAt: paymentDate,
            updatedAt: paymentDate,
          };
          vendorPayments.push(payment);

          // Update bill status
          bill.status = "PAID";
          bill.updatedAt = paymentDate;

          // Create Ledger Entries for Payment
          ledgerEntries.push(
            {
              accountId: 6, // Accounts Payable
              transactionDate: paymentDate,
              description: `Payment ${payment.paymentNumber} - AP`,
              debit: poTotal.toFixed(2),
              credit: "0.00",
              referenceType: "VENDOR_PAYMENT",
              createdAt: paymentDate,
            },
            {
              accountId: 3, // Cash
              transactionDate: paymentDate,
              description: `Payment ${payment.paymentNumber} - Cash`,
              debit: "0.00",
              credit: poTotal.toFixed(2),
              referenceType: "VENDOR_PAYMENT",
              createdAt: paymentDate,
            }
          );
        }
      }

      // Create Vendor Notes (occasional)
      if (Math.random() < 0.3) {
        vendorNotes.push({
          vendorId,
          userId: 1,
          note: faker.lorem.sentence(),
          createdAt: sessionDate,
          updatedAt: sessionDate,
        });
      }
    }
  }

  return {
    purchaseOrders,
    purchaseOrderItems,
    intakeSessions,
    intakeSessionBatches,
    batchStatusHistory,
    bills,
    billLineItems,
    vendorPayments,
    ledgerEntries,
    vendorNotes,
  };
}
