import { searchProducts, getSearchFilterOptions } from '../src/actions/search';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = new PrismaClient();

// Mock the utility functions
jest.mock('../src/lib/cogs', () => ({
  getActiveBatchCost: jest.fn().mockResolvedValue(5000) // $50.00 in cents
}));

jest.mock('../src/lib/vendorDisplay', () => ({
  getVendorDisplayName: jest.fn().mockReturnValue('VENDOR001')
}));

describe('Search Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'Test Product 1',
        description: 'Test description',
        category: 'electronics',
        unit: 'piece',
        isActive: true,
        defaultPrice: 10000, // $100.00 in cents
        batches: [
          {
            id: 'batch-1',
            batchNumber: 'B001',
            receivedDate: new Date('2024-01-01'),
            vendor: {
              id: 'vendor-1',
              vendorCode: 'VENDOR001',
              companyName: 'Test Vendor'
            },
            batchCosts: [
              {
                id: 'cost-1',
                effectiveFrom: new Date('2024-01-01'),
                unitCost: 5000
              }
            ],
            inventoryLots: [
              {
                id: 'lot-1',
                location: 'Warehouse A',
                qtyOnHand: 100,
                qtyAllocated: 10,
                reorderPoint: 20
              }
            ]
          }
        ],
        intakePhotos: [
          {
            id: 'photo-1',
            filename: 'test-image.jpg'
          }
        ]
      }
    ];

    beforeEach(() => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.findUnique.mockResolvedValue(mockProducts[0]);
    });

    test('should return products with basic search', async () => {
      const results = await searchProducts({});
      
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: { name: 'asc' }
      });
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'product-1',
        sku: 'SKU001',
        name: 'Test Product 1',
        category: 'electronics'
      });
    });

    test('should filter by keyword', async () => {
      await searchProducts({ keyword: 'test' });
      
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { sku: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    test('should filter by category', async () => {
      await searchProducts({ category: 'electronics' });
      
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          category: 'electronics'
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    test('should calculate availability correctly', async () => {
      const results = await searchProducts({});
      
      expect(results[0].inventoryLot).toMatchObject({
        qtyOnHand: 100,
        qtyAllocated: 10,
        qtyAvailable: 90, // 100 - 10
        availability: 'available' // > reorderPoint (20)
      });
    });

    test('should detect low stock', async () => {
      const lowStockProduct = {
        ...mockProducts[0],
        batches: [
          {
            ...mockProducts[0].batches[0],
            inventoryLots: [
              {
                id: 'lot-1',
                location: 'Warehouse A',
                qtyOnHand: 15, // Below reorder point of 20
                qtyAllocated: 0,
                reorderPoint: 20
              }
            ]
          }
        ]
      };

      mockPrisma.product.findMany.mockResolvedValue([lowStockProduct]);
      
      const results = await searchProducts({});
      
      expect(results[0].inventoryLot.availability).toBe('low_stock');
    });

    test('should detect out of stock', async () => {
      const outOfStockProduct = {
        ...mockProducts[0],
        batches: [
          {
            ...mockProducts[0].batches[0],
            inventoryLots: [
              {
                id: 'lot-1',
                location: 'Warehouse A',
                qtyOnHand: 10,
                qtyAllocated: 10, // All allocated
                reorderPoint: 20
              }
            ]
          }
        ]
      };

      mockPrisma.product.findMany.mockResolvedValue([outOfStockProduct]);
      
      const results = await searchProducts({});
      
      expect(results[0].inventoryLot.availability).toBe('out_of_stock');
    });

    test('should filter by availability', async () => {
      const results = await searchProducts({ availability: 'available' });
      
      // Should only return products that are available
      expect(results.every(r => r.inventoryLot?.availability === 'available')).toBe(true);
    });

    test('should filter by vendor code', async () => {
      const results = await searchProducts({ vendorCode: 'VENDOR001' });
      
      // Should only return products from the specified vendor
      expect(results.every(r => r.batch?.vendorCode === 'VENDOR001')).toBe(true);
    });

    test('should filter by location', async () => {
      const results = await searchProducts({ location: 'Warehouse A' });
      
      // Should only return products from the specified location
      expect(results.every(r => r.inventoryLot?.location === 'Warehouse A')).toBe(true);
    });

    test('should filter by price range', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProducts[0]);
      
      const results = await searchProducts({ 
        priceMin: 5000, // $50.00
        priceMax: 15000 // $150.00
      });
      
      // Should only return products within price range
      expect(results.every(r => r.displayPrice >= 5000 && r.displayPrice <= 15000)).toBe(true);
    });
  });

  describe('getSearchFilterOptions', () => {
    test('should return filter options', async () => {
      const mockCategories = [
        { category: 'electronics' },
        { category: 'clothing' }
      ];
      
      const mockLocations = [
        { location: 'Warehouse A' },
        { location: 'Warehouse B' }
      ];
      
      const mockVendors = [
        {
          id: 'vendor-1',
          vendorCode: 'VENDOR001',
          companyName: 'Test Vendor 1'
        },
        {
          id: 'vendor-2',
          vendorCode: 'VENDOR002',
          companyName: 'Test Vendor 2'
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockCategories);
      mockPrisma.inventoryLot.findMany.mockResolvedValue(mockLocations);
      mockPrisma.vendor.findMany.mockResolvedValue(mockVendors);

      const options = await getSearchFilterOptions();

      expect(options).toEqual({
        categories: ['electronics', 'clothing'],
        locations: ['Warehouse A', 'Warehouse B'],
        vendors: [
          {
            id: 'vendor-1',
            vendorCode: 'VENDOR001',
            displayName: 'VENDOR001'
          },
          {
            id: 'vendor-2',
            vendorCode: 'VENDOR002',
            displayName: 'VENDOR001'
          }
        ]
      });
    });
  });
});

