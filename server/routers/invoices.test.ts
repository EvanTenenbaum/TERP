import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../_core/app';
import { createTRPCContext } from '../_core/trpc';
import { db } from '../../scripts/db-sync';
import { invoices, orders } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Invoices Router - Integration Tests', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const ctx = await createTRPCContext({} as any);
    caller = appRouter.createCaller(ctx);
  });

  describe('AR Aging Calculations', () => {
    it('should correctly calculate AR aging buckets', async () => {
      // Arrange: Get invoices with different due dates
      const allInvoices = await db.select().from(invoices);
      
      // Act: Calculate AR aging
      const arBuckets = await caller.invoices.calculateARBuckets();
      
      // Assert: Buckets should sum to total AR
      const totalAR = arBuckets.current + arBuckets.days30 + arBuckets.days60 + arBuckets.days90 + arBuckets.days120Plus;
      const expectedTotal = allInvoices
        .filter(inv => inv.status !== 'PAID')
        .reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      
      expect(totalAR).toBeCloseTo(expectedTotal, 2);
    });

    it('should categorize overdue invoices correctly', async () => {
      // Arrange: Create an invoice that's 45 days overdue
      const testOrder = await db.select().from(orders).limit(1);
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 45);
      
      const invoice = await db.insert(invoices).values({
        orderId: testOrder[0].id,
        invoiceNumber: 'TEST-INV-001',
        total: '1000.00',
        dueDate: overdueDate,
        status: 'OVERDUE',
      });
      
      // Act: Get AR buckets
      const arBuckets = await caller.invoices.calculateARBuckets();
      
      // Assert: Should be in 30-60 day bucket
      expect(arBuckets.days30).toBeGreaterThan(0);
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice from order', async () => {
      // Arrange: Get an order without an invoice
      const testOrder = await db.select().from(orders).limit(1);
      
      // Act: Generate invoice
      const invoice = await caller.invoices.generateFromOrder({ orderId: testOrder[0].id });
      
      // Assert: Invoice created with correct data
      expect(invoice.orderId).toBe(testOrder[0].id);
      expect(invoice.total).toBe(testOrder[0].total);
      expect(invoice.status).toBe('PENDING');
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
    });
  });

  describe('Payment Processing', () => {
    it('should mark invoice as paid and update status', async () => {
      // Arrange: Get a pending invoice
      const pendingInvoice = await db.select()
        .from(invoices)
        .where(eq(invoices.status, 'PENDING'))
        .limit(1);
      
      // Act: Mark as paid
      await caller.invoices.markPaid({ 
        invoiceId: pendingInvoice[0].id,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER'
      });
      
      // Assert: Status updated
      const updatedInvoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, pendingInvoice[0].id));
      
      expect(updatedInvoice[0].status).toBe('PAID');
      expect(updatedInvoice[0].paidAt).toBeDefined();
    });
  });
});
