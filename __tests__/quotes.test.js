import { createQuote, updateQuoteStatus, convertQuoteToOrder } from '../src/actions/quotes';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = new PrismaClient();

// Mock Next.js functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

describe('Quote Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuote', () => {
    const mockCustomer = {
      id: 'customer-1',
      companyName: 'Test Customer',
      contactName: 'John Doe',
      email: 'john@test.com'
    };

    const mockProduct = {
      id: 'product-1',
      sku: 'SKU001',
      name: 'Test Product'
    };

    const mockBatch = {
      id: 'batch-1',
      batchNumber: 'B001'
    };

    const mockInventoryLot = {
      id: 'lot-1',
      qtyOnHand: 100,
      qtyAllocated: 10
    };

    const mockQuoteData = {
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          batchId: 'batch-1',
          inventoryLotId: 'lot-1',
          quantity: 5,
          unitPrice: 10000 // $100.00 in cents
        }
      ],
      notes: 'Test quote notes',
      validUntil: new Date('2024-12-31')
    };

    beforeEach(() => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.batch.findUnique.mockResolvedValue(mockBatch);
      mockPrisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);
    });

    test('should create quote successfully', async () => {
      const mockCreatedQuote = {
        id: 'quote-1',
        quoteNumber: 'Q20240001',
        customerId: 'customer-1',
        totalAmount: 50000, // 5 * $100.00
        status: 'draft',
        shareToken: 'mock-token',
        notes: 'Test quote notes',
        validUntil: new Date('2024-12-31'),
        customer: mockCustomer,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            batchId: 'batch-1',
            inventoryLotId: 'lot-1',
            quantity: 5,
            unitPrice: 10000,
            totalPrice: 50000,
            product: mockProduct,
            batch: { vendor: { vendorCode: 'VENDOR001' } },
            inventoryLot: mockInventoryLot
          }
        ]
      };

      mockPrisma.salesQuote.create.mockResolvedValue(mockCreatedQuote);

      const result = await createQuote(mockQuoteData);

      expect(result.success).toBe(true);
      expect(result.quote).toEqual(mockCreatedQuote);
      expect(mockPrisma.salesQuote.create).toHaveBeenCalledWith({
        data: {
          quoteNumber: expect.stringMatching(/^Q\d{4}\d{4}$/),
          customerId: 'customer-1',
          totalAmount: 50000,
          status: 'draft',
          shareToken: expect.any(String),
          notes: 'Test quote notes',
          validUntil: new Date('2024-12-31'),
          items: {
            create: [
              {
                productId: 'product-1',
                batchId: 'batch-1',
                inventoryLotId: 'lot-1',
                quantity: 5,
                unitPrice: 10000,
                totalPrice: 50000
              }
            ]
          }
        },
        include: expect.any(Object)
      });
    });

    test('should fail if customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const result = await createQuote(mockQuoteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    test('should fail if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await createQuote(mockQuoteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found: product-1');
    });

    test('should fail if batch not found', async () => {
      mockPrisma.batch.findUnique.mockResolvedValue(null);

      const result = await createQuote(mockQuoteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Batch not found: batch-1');
    });

    test('should fail if inventory lot not found', async () => {
      mockPrisma.inventoryLot.findUnique.mockResolvedValue(null);

      const result = await createQuote(mockQuoteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Inventory lot not found: lot-1');
    });

    test('should calculate total amount correctly', async () => {
      const multiItemQuoteData = {
        ...mockQuoteData,
        items: [
          {
            productId: 'product-1',
            batchId: 'batch-1',
            inventoryLotId: 'lot-1',
            quantity: 5,
            unitPrice: 10000 // $100.00
          },
          {
            productId: 'product-2',
            batchId: 'batch-2',
            inventoryLotId: 'lot-2',
            quantity: 3,
            unitPrice: 15000 // $150.00
          }
        ]
      };

      // Mock additional products/batches/lots
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ id: 'product-2', sku: 'SKU002', name: 'Test Product 2' });
      mockPrisma.batch.findUnique
        .mockResolvedValueOnce(mockBatch)
        .mockResolvedValueOnce({ id: 'batch-2', batchNumber: 'B002' });
      mockPrisma.inventoryLot.findUnique
        .mockResolvedValueOnce(mockInventoryLot)
        .mockResolvedValueOnce({ id: 'lot-2', qtyOnHand: 50, qtyAllocated: 5 });

      const mockCreatedQuote = {
        id: 'quote-1',
        totalAmount: 95000, // (5 * $100) + (3 * $150) = $950
        // ... other properties
      };

      mockPrisma.salesQuote.create.mockResolvedValue(mockCreatedQuote);

      const result = await createQuote(multiItemQuoteData);

      expect(mockPrisma.salesQuote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 95000
          })
        })
      );
    });
  });

  describe('updateQuoteStatus', () => {
    test('should update quote status successfully', async () => {
      const mockUpdatedQuote = {
        id: 'quote-1',
        status: 'sent',
        customer: { companyName: 'Test Customer' },
        items: []
      };

      mockPrisma.salesQuote.update.mockResolvedValue(mockUpdatedQuote);

      const result = await updateQuoteStatus('quote-1', 'sent');

      expect(result.success).toBe(true);
      expect(result.quote).toEqual(mockUpdatedQuote);
      expect(mockPrisma.salesQuote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { status: 'sent' },
        include: expect.any(Object)
      });
    });

    test('should handle update errors', async () => {
      mockPrisma.salesQuote.update.mockRejectedValue(new Error('Database error'));

      const result = await updateQuoteStatus('quote-1', 'sent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('convertQuoteToOrder', () => {
    const mockQuote = {
      id: 'quote-1',
      status: 'accepted',
      customerId: 'customer-1',
      totalAmount: 50000,
      customer: { companyName: 'Test Customer' },
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          batchId: 'batch-1',
          inventoryLotId: 'lot-1',
          quantity: 5,
          unitPrice: 10000,
          totalPrice: 50000,
          product: { sku: 'SKU001' },
          batch: {},
          inventoryLot: {}
        }
      ]
    };

    test('should convert accepted quote to order', async () => {
      const mockInventoryLot = {
        id: 'lot-1',
        qtyOnHand: 100,
        qtyAllocated: 10
      };

      const mockCreatedOrder = {
        id: 'order-1',
        orderNumber: 'O20240001',
        customerId: 'customer-1',
        totalAmount: 50000,
        status: 'pending'
      };

      mockPrisma.salesQuote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);
      mockPrisma.inventoryLot.update.mockResolvedValue({});
      mockPrisma.salesQuote.update.mockResolvedValue({});

      const result = await convertQuoteToOrder('quote-1');

      expect(result.success).toBe(true);
      expect(result.order).toEqual(mockCreatedOrder);
      
      // Should create order
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: {
          orderNumber: expect.stringMatching(/^O\d{4}\d{4}$/),
          customerId: 'customer-1',
          totalAmount: 50000,
          status: 'pending',
          allocationDate: expect.any(Date),
          items: {
            create: [
              {
                productId: 'product-1',
                batchId: 'batch-1',
                inventoryLotId: 'lot-1',
                quantity: 5,
                unitPrice: 10000,
                totalPrice: 50000,
                allocationDate: expect.any(Date)
              }
            ]
          }
        },
        include: expect.any(Object)
      });

      // Should update inventory allocation
      expect(mockPrisma.inventoryLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          qtyAllocated: {
            increment: 5
          }
        }
      });
    });

    test('should fail if quote not found', async () => {
      mockPrisma.salesQuote.findUnique.mockResolvedValue(null);

      const result = await convertQuoteToOrder('quote-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quote not found');
    });

    test('should fail if quote not accepted', async () => {
      const draftQuote = { ...mockQuote, status: 'draft' };
      mockPrisma.salesQuote.findUnique.mockResolvedValue(draftQuote);

      const result = await convertQuoteToOrder('quote-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only accepted quotes can be converted to orders');
    });

    test('should fail if insufficient stock', async () => {
      const mockInventoryLot = {
        id: 'lot-1',
        qtyOnHand: 10,
        qtyAllocated: 8 // Only 2 available, but quote needs 5
      };

      mockPrisma.salesQuote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);

      const result = await convertQuoteToOrder('quote-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
    });
  });
});

