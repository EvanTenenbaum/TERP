/**
 * Tests for arApDb soft-delete filtering
 * Ensures that getInvoices() and getPayments() properly filter out soft-deleted records
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { invoices, payments, clients, users } from "../drizzle/schema";
import { getInvoices, getPayments } from "./arApDb";
import { sql } from "drizzle-orm";

describe("arApDb Soft-Delete Filtering", () => {
  let testClientId: number;
  let testUserId: number;
  let activeInvoiceId: number;
  let deletedInvoiceId: number;
  let activePaymentId: number;
  let deletedPaymentId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available for testing");

    // Create test user
    const userResult = await db.insert(users).values({
      openId: `test-user-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    });
    testUserId = Number(userResult[0].insertId);

    // Create test client
    const clientResult = await db.insert(clients).values({
      teriCode: `TEST-${Date.now()}`,
      name: "Test Client for Soft Delete",
      isBuyer: true,
    });
    testClientId = Number(clientResult[0].insertId);

    // Create active invoice
    const activeInvoiceResult = await db.insert(invoices).values({
      invoiceNumber: `INV-ACTIVE-${Date.now()}`,
      customerId: testClientId,
      invoiceDate: new Date("2025-01-01"),
      dueDate: new Date("2025-01-31"),
      subtotal: "1000.00",
      taxAmount: "80.00",
      discountAmount: "0.00",
      totalAmount: "1080.00",
      amountPaid: "0.00",
      amountDue: "1080.00",
      status: "SENT",
      createdBy: testUserId,
      deletedAt: null, // Active record
    });
    activeInvoiceId = Number(activeInvoiceResult[0].insertId);

    // Create soft-deleted invoice
    const deletedInvoiceResult = await db.insert(invoices).values({
      invoiceNumber: `INV-DELETED-${Date.now()}`,
      customerId: testClientId,
      invoiceDate: new Date("2025-01-01"),
      dueDate: new Date("2025-01-31"),
      subtotal: "2000.00",
      taxAmount: "160.00",
      discountAmount: "0.00",
      totalAmount: "2160.00",
      amountPaid: "0.00",
      amountDue: "2160.00",
      status: "SENT",
      createdBy: testUserId,
      deletedAt: new Date(), // Soft-deleted
    });
    deletedInvoiceId = Number(deletedInvoiceResult[0].insertId);

    // Create active payment
    const activePaymentResult = await db.insert(payments).values({
      paymentNumber: `PAY-ACTIVE-${Date.now()}`,
      paymentType: "RECEIVED",
      paymentDate: new Date("2025-01-15"),
      amount: "500.00",
      paymentMethod: "CASH",
      customerId: testClientId,
      invoiceId: activeInvoiceId,
      createdBy: testUserId,
      deletedAt: null, // Active record
    });
    activePaymentId = Number(activePaymentResult[0].insertId);

    // Create soft-deleted payment
    const deletedPaymentResult = await db.insert(payments).values({
      paymentNumber: `PAY-DELETED-${Date.now()}`,
      paymentType: "RECEIVED",
      paymentDate: new Date("2025-01-15"),
      amount: "1000.00",
      paymentMethod: "CASH",
      customerId: testClientId,
      invoiceId: activeInvoiceId,
      createdBy: testUserId,
      deletedAt: new Date(), // Soft-deleted
    });
    deletedPaymentId = Number(deletedPaymentResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(payments).where(sql`id IN (${activePaymentId}, ${deletedPaymentId})`);
    await db.delete(invoices).where(sql`id IN (${activeInvoiceId}, ${deletedInvoiceId})`);
    await db.delete(clients).where(sql`id = ${testClientId}`);
    await db.delete(users).where(sql`id = ${testUserId}`);
  });

  describe("getInvoices", () => {
    it("should only return active invoices (exclude soft-deleted)", async () => {
      const result = await getInvoices({ customerId: testClientId });
      
      expect(result.invoices).toBeDefined();
      expect(Array.isArray(result.invoices)).toBe(true);
      
      // Should find the active invoice
      const activeInvoice = result.invoices.find((inv: any) => inv.id === activeInvoiceId);
      expect(activeInvoice).toBeDefined();
      expect(activeInvoice?.deletedAt).toBeNull();
      
      // Should NOT find the deleted invoice
      const deletedInvoice = result.invoices.find((inv: any) => inv.id === deletedInvoiceId);
      expect(deletedInvoice).toBeUndefined();
    });

    it("should filter by status AND exclude soft-deleted", async () => {
      const result = await getInvoices({ 
        customerId: testClientId,
        status: "SENT" 
      });
      
      // Should only return active SENT invoices
      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
      result.invoices.forEach((inv: any) => {
        expect(inv.deletedAt).toBeNull();
        expect(inv.status).toBe("SENT");
      });
    });
  });

  describe("getPayments", () => {
    it("should only return active payments (exclude soft-deleted)", async () => {
      const result = await getPayments({ customerId: testClientId });
      
      expect(result.payments).toBeDefined();
      expect(Array.isArray(result.payments)).toBe(true);
      
      // Should find the active payment
      const activePayment = result.payments.find((pmt: any) => pmt.id === activePaymentId);
      expect(activePayment).toBeDefined();
      expect(activePayment?.deletedAt).toBeNull();
      
      // Should NOT find the deleted payment
      const deletedPayment = result.payments.find((pmt: any) => pmt.id === deletedPaymentId);
      expect(deletedPayment).toBeUndefined();
    });

    it("should filter by paymentType AND exclude soft-deleted", async () => {
      const result = await getPayments({ 
        customerId: testClientId,
        paymentType: "RECEIVED" 
      });
      
      // Should only return active RECEIVED payments
      expect(result.payments.length).toBeGreaterThanOrEqual(1);
      result.payments.forEach((pmt: any) => {
        expect(pmt.deletedAt).toBeNull();
        expect(pmt.paymentType).toBe("RECEIVED");
      });
    });

    it("should filter by invoiceId AND exclude soft-deleted", async () => {
      const result = await getPayments({ invoiceId: activeInvoiceId });
      
      // Should only return active payments for this invoice
      result.payments.forEach((pmt: any) => {
        expect(pmt.deletedAt).toBeNull();
        expect(pmt.invoiceId).toBe(activeInvoiceId);
      });
    });
  });
});
