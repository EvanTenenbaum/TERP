jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ defaultPrice: 10000 }),
    },
    vendor: {
      findMany: jest.fn(),
    },
    priceBookEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}))

const prisma = require('@/lib/prisma').default
const { searchProducts, getSearchFilterOptions } = require('@/actions/search')

describe('Search Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchProducts', () => {
    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'Test Product 1',
        category: 'electronics',
        unit: 'piece',
        isActive: true,
        defaultPrice: 10000,
        location: 'Warehouse A',
        batches: [
          {
            id: 'batch-1',
            lotNumber: 'B001',
            receivedDate: new Date('2024-01-01'),
            vendor: { id: 'vendor-1', vendorCode: 'VENDOR001', companyName: 'Test Vendor' },
            batchCosts: [{ id: 'cost-1', effectiveFrom: new Date('2024-01-01'), unitCost: 5000 }],
            inventoryLot: { id: 'lot-1', quantityOnHand: 100, quantityAllocated: 10, quantityAvailable: 90 },
          },
        ],
        photos: [{ id: 'photo-1', filePath: '/test.jpg' }],
      },
    ]

    beforeEach(() => {
      prisma.product.findMany.mockResolvedValue(mockProducts)
    })

    test('returns mapped results with availability and pricing', async () => {
      const results = await searchProducts({})
      expect(prisma.product.findMany).toHaveBeenCalled()
      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        id: 'product-1',
        sku: 'SKU001',
        name: 'Test Product 1',
        category: 'electronics',
        availability: 'available',
        quantityAvailable: 90,
        vendorCode: 'VENDOR001',
      })
    })

    test('filters by keyword', async () => {
      await searchProducts({ keyword: 'test' })
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })

    test('filters by category/location and price range', async () => {
      await searchProducts({ category: 'electronics', location: 'Warehouse A', minPrice: 1000, maxPrice: 20000 })
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'electronics', location: 'Warehouse A' }) })
      )
    })

    test('applies availability filter', async () => {
      const results = await searchProducts({ availability: 'available' })
      expect(results.every(r => r.availability === 'available')).toBe(true)
    })
  })

  describe('getSearchFilterOptions', () => {
    test('returns categories, locations, vendors', async () => {
      prisma.product.findMany
        .mockResolvedValueOnce([{ category: 'electronics' }, { category: 'clothing' }])
        .mockResolvedValueOnce([{ location: 'A' }, { location: 'B' }])
      prisma.vendor.findMany.mockResolvedValueOnce([{ vendorCode: 'V1', companyName: 'Vendor 1' }])
      const res = await getSearchFilterOptions()
      expect(res.categories).toContain('electronics')
      expect(res.locations.length).toBeGreaterThan(0)
      expect(res.vendors[0]).toMatchObject({ code: 'V1', name: 'Vendor 1' })
    })
  })
})
