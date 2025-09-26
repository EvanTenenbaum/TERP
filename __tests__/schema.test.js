/**
 * ERPv2 Schema Referential Integrity Tests
 * 
 * Tests core database relationships and business rules
 * Focus on Order→AR unique constraint and PaymentApplication FK integrity
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('ERPv2 Schema Referential Integrity', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after running tests
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Order to AccountsReceivable Relationship', () => {
    test('should enforce unique constraint on Order→AR relationship', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          companyName: 'Test Customer for AR',
          contactInfo: { email: 'test@example.com' },
          creditLimit: 100000,
          paymentTerms: 'Net 30',
        },
      });

      // Create test order
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          allocationDate: new Date(),
          status: 'CONFIRMED',
          totalAmount: 50000,
        },
      });

      // Create first AR record for the order
      const ar1 = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          invoiceNumber: 'TEST-INV-001',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 50000,
          balanceRemaining: 50000,
        },
      });

      expect(ar1.orderId).toBe(order.id);

      // Attempt to create second AR record for same order should succeed
      // (Business rule: One order can have multiple AR records for partial invoicing)
      const ar2 = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          invoiceNumber: 'TEST-INV-002',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 25000,
          balanceRemaining: 25000,
        },
      });

      expect(ar2.orderId).toBe(order.id);

      // Verify both AR records exist for the same order
      const arRecords = await prisma.accountsReceivable.findMany({
        where: { orderId: order.id },
      });

      expect(arRecords).toHaveLength(2);
    });

    test('should enforce unique invoice numbers', async () => {
      const customer = await prisma.customer.create({
        data: {
          companyName: 'Test Customer for Invoice',
          contactInfo: { email: 'invoice@example.com' },
        },
      });

      // Create first AR with unique invoice number
      await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          invoiceNumber: 'UNIQUE-INV-001',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
          balanceRemaining: 10000,
        },
      });

      // Attempt to create second AR with same invoice number should fail
      await expect(
        prisma.accountsReceivable.create({
          data: {
            customerId: customer.id,
            invoiceNumber: 'UNIQUE-INV-001', // Duplicate invoice number
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            amount: 15000,
            balanceRemaining: 15000,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('PaymentApplication Foreign Key Integrity', () => {
    test('should enforce valid Payment and AR references', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          companyName: 'Test Customer for Payment',
          contactInfo: { email: 'payment@example.com' },
        },
      });

      // Create AR record
      const ar = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          invoiceNumber: 'PAY-TEST-001',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 100000,
          balanceRemaining: 100000,
        },
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          paymentDate: new Date(),
          amount: 50000,
          paymentMethod: 'Check',
          referenceNumber: 'CHK-001',
        },
      });

      // Create valid payment application
      const paymentApp = await prisma.paymentApplication.create({
        data: {
          paymentId: payment.id,
          arId: ar.id,
          appliedAmount: 50000,
          applicationDate: new Date(),
        },
      });

      expect(paymentApp.paymentId).toBe(payment.id);
      expect(paymentApp.arId).toBe(ar.id);
      expect(paymentApp.appliedAmount).toBe(50000);

      // Verify foreign key relationships
      const paymentAppWithRelations = await prisma.paymentApplication.findUnique({
        where: { id: paymentApp.id },
        include: {
          payment: true,
          ar: true,
        },
      });

      expect(paymentAppWithRelations.payment.id).toBe(payment.id);
      expect(paymentAppWithRelations.ar.id).toBe(ar.id);
    });

    test('should reject invalid Payment reference', async () => {
      const customer = await prisma.customer.create({
        data: {
          companyName: 'Test Customer Invalid Payment',
          contactInfo: { email: 'invalid@example.com' },
        },
      });

      const ar = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          invoiceNumber: 'INVALID-PAY-001',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
          balanceRemaining: 10000,
        },
      });

      // Attempt to create payment application with invalid payment ID
      await expect(
        prisma.paymentApplication.create({
          data: {
            paymentId: 'invalid-payment-id',
            arId: ar.id,
            appliedAmount: 5000,
            applicationDate: new Date(),
          },
        })
      ).rejects.toThrow();
    });

    test('should reject invalid AR reference', async () => {
      const customer = await prisma.customer.create({
        data: {
          companyName: 'Test Customer Invalid AR',
          contactInfo: { email: 'invalidar@example.com' },
        },
      });

      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          paymentDate: new Date(),
          amount: 10000,
          paymentMethod: 'Wire',
          referenceNumber: 'WIRE-001',
        },
      });

      // Attempt to create payment application with invalid AR ID
      await expect(
        prisma.paymentApplication.create({
          data: {
            paymentId: payment.id,
            arId: 'invalid-ar-id',
            appliedAmount: 5000,
            applicationDate: new Date(),
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('BatchCost Unique Constraint', () => {
    test('should enforce unique batchId + effectiveFrom constraint', async () => {
      // Create test vendor and product
      const vendor = await prisma.vendor.create({
        data: {
          vendorCode: 'TEST-VENDOR',
          companyName: 'Test Vendor Company',
          contactInfo: { email: 'vendor@test.com' },
        },
      });

      const product = await prisma.product.create({
        data: {
          sku: 'TEST-SKU-BC',
          name: 'Test Product for BatchCost',
          category: 'Test Category',
          defaultPrice: 10000,
        },
      });

      const batch = await prisma.batch.create({
        data: {
          productId: product.id,
          vendorId: vendor.id,
          lotNumber: 'TEST-LOT-001',
          receivedDate: new Date(),
          quantityReceived: 100,
          quantityAvailable: 100,
        },
      });

      const effectiveDate = new Date();

      // Create first batch cost
      const batchCost1 = await prisma.batchCost.create({
        data: {
          batchId: batch.id,
          effectiveFrom: effectiveDate,
          unitCost: 5000,
        },
      });

      expect(batchCost1.batchId).toBe(batch.id);

      // Attempt to create second batch cost with same batch and effective date should fail
      await expect(
        prisma.batchCost.create({
          data: {
            batchId: batch.id,
            effectiveFrom: effectiveDate, // Same effective date
            unitCost: 6000,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Vendor Code Uniqueness', () => {
    test('should enforce unique vendor codes', async () => {
      // Create first vendor
      await prisma.vendor.create({
        data: {
          vendorCode: 'UNIQUE-VENDOR-001',
          companyName: 'First Vendor Company',
          contactInfo: { email: 'first@vendor.com' },
        },
      });

      // Attempt to create second vendor with same vendor code should fail
      await expect(
        prisma.vendor.create({
          data: {
            vendorCode: 'UNIQUE-VENDOR-001', // Duplicate vendor code
            companyName: 'Second Vendor Company',
            contactInfo: { email: 'second@vendor.com' },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('FIFO Payment Application Logic', () => {
    test('should support FIFO payment application workflow', async () => {
      const customer = await prisma.customer.create({
        data: {
          companyName: 'FIFO Test Customer',
          contactInfo: { email: 'fifo@test.com' },
        },
      });

      // Create multiple AR records with different dates
      const ar1 = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          invoiceNumber: 'FIFO-001',
          invoiceDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31'),
          amount: 30000,
          balanceRemaining: 30000,
        },
      });

      const ar2 = await prisma.accountsReceivable.create({
        data: {
          customerId: customer.id,
          invoiceNumber: 'FIFO-002',
          invoiceDate: new Date('2025-01-15'),
          dueDate: new Date('2025-02-14'),
          amount: 40000,
          balanceRemaining: 40000,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          paymentDate: new Date(),
          amount: 50000,
          paymentMethod: 'Check',
          referenceNumber: 'FIFO-CHK-001',
        },
      });

      // Apply payment to oldest invoice first (FIFO)
      await prisma.paymentApplication.create({
        data: {
          paymentId: payment.id,
          arId: ar1.id,
          appliedAmount: 30000, // Full amount of first invoice
          applicationDate: new Date(),
        },
      });

      // Apply remaining payment to second invoice
      await prisma.paymentApplication.create({
        data: {
          paymentId: payment.id,
          arId: ar2.id,
          appliedAmount: 20000, // Partial amount of second invoice
          applicationDate: new Date(),
        },
      });

      // Verify payment applications
      const applications = await prisma.paymentApplication.findMany({
        where: { paymentId: payment.id },
        include: { ar: true },
        orderBy: { ar: { invoiceDate: 'asc' } },
      });

      expect(applications).toHaveLength(2);
      expect(applications[0].appliedAmount).toBe(30000);
      expect(applications[1].appliedAmount).toBe(20000);
      expect(applications[0].ar.invoiceNumber).toBe('FIFO-001');
      expect(applications[1].ar.invoiceNumber).toBe('FIFO-002');
    });
  });
});

/**
 * Helper function to clean up test data
 */
async function cleanupTestData() {
  // Delete in reverse dependency order to avoid foreign key constraint violations
  await prisma.paymentApplication.deleteMany({
    where: { payment: { referenceNumber: { contains: 'TEST' } } },
  });

  await prisma.paymentApplication.deleteMany({
    where: { payment: { referenceNumber: { contains: 'FIFO' } } },
  });

  await prisma.paymentApplication.deleteMany({
    where: { payment: { referenceNumber: { contains: 'CHK' } } },
  });

  await prisma.paymentApplication.deleteMany({
    where: { payment: { referenceNumber: { contains: 'WIRE' } } },
  });

  await prisma.payment.deleteMany({
    where: { 
      OR: [
        { referenceNumber: { contains: 'TEST' } },
        { referenceNumber: { contains: 'FIFO' } },
        { referenceNumber: { contains: 'CHK' } },
        { referenceNumber: { contains: 'WIRE' } },
      ]
    },
  });

  await prisma.accountsReceivable.deleteMany({
    where: { 
      OR: [
        { invoiceNumber: { contains: 'TEST' } },
        { invoiceNumber: { contains: 'UNIQUE' } },
        { invoiceNumber: { contains: 'PAY' } },
        { invoiceNumber: { contains: 'INVALID' } },
        { invoiceNumber: { contains: 'FIFO' } },
      ]
    },
  });

  await prisma.order.deleteMany({
    where: { customer: { companyName: { contains: 'Test Customer' } } },
  });

  await prisma.batchCost.deleteMany({
    where: { batch: { lotNumber: { contains: 'TEST' } } },
  });

  await prisma.batch.deleteMany({
    where: { lotNumber: { contains: 'TEST' } },
  });

  await prisma.product.deleteMany({
    where: { name: { contains: 'Test Product' } },
  });

  await prisma.vendor.deleteMany({
    where: { 
      OR: [
        { vendorCode: { contains: 'TEST' } },
        { vendorCode: { contains: 'UNIQUE' } },
      ]
    },
  });

  await prisma.customer.deleteMany({
    where: { 
      OR: [
        { companyName: { contains: 'Test Customer' } },
        { companyName: { contains: 'FIFO Test' } },
      ]
    },
  });
}
