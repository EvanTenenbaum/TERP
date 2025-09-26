jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    salesQuote: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    order: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
    batch: { findFirst: jest.fn() },
    inventoryLot: { update: jest.fn() },
    accountsReceivable: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    priceBookEntry: { findFirst: jest.fn().mockResolvedValue(null) },
    product: { findUnique: jest.fn().mockResolvedValue({ defaultPrice: 1000 }) },
    customer: { findUnique: jest.fn().mockResolvedValue({ paymentTerms: 'Net 30' }) },
  },
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/inventoryAllocator', () => ({ allocateFIFOByProduct: jest.fn().mockResolvedValue([{ lotId: 'l1', batchId: 'b1', qty: 1 }]), shipAllocated: jest.fn() }))
jest.mock('@/lib/cogs', () => ({ getActiveBatchCostDb: jest.fn().mockResolvedValue({ unitCost: 100 }) }))
const prisma = require('@/lib/prisma').default
prisma.$transaction = async (fn) => fn(prisma)
const { createQuote, convertQuoteToOrder } = require('@/actions/quotes')

describe('Quote actions', () => {
  beforeEach(() => jest.clearAllMocks())

  test('createQuote creates quote with items and totals', async () => {
    prisma.salesQuote.create.mockResolvedValue({ id: 'q1', totalAmount: 2000, quoteItems: [] })
    const res = await createQuote({ customerId: 'c1', items: [ { productId: 'p1', quantity: 2, unitPrice: 1000 } ] })
    expect(res.success).toBe(true)
    expect(prisma.salesQuote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: 'c1',
        totalAmount: 2000,
        quoteItems: expect.objectContaining({ create: expect.any(Array) }),
      }),
    }))
  })

  test('convertQuoteToOrder allocates and creates AR', async () => {
    prisma.salesQuote.findUnique.mockResolvedValue({
      id: 'q1', status: 'ACCEPTED', customerId: 'c1', customer: { paymentTerms: 'Net 30' },
      quoteItems: [ { productId: 'p1', quantity: 1, product: {} } ],
    })
    prisma.batch.findFirst.mockResolvedValue({ id: 'b1', inventoryLot: { id: 'l1' } })
    prisma.order.create.mockResolvedValue({ id: 'o1', totalAmount: 1000, customerId: 'c1', orderItems: [] })
    const { allocateFIFOByProduct } = require('@/lib/inventoryAllocator')
    const res = await convertQuoteToOrder('q1')
    expect(res.success).toBe(true)
    expect(allocateFIFOByProduct).toHaveBeenCalled()
    expect(prisma.accountsReceivable.create).toHaveBeenCalled()
  })
})
