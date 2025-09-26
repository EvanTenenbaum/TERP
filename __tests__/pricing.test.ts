import { getEffectiveUnitPrice } from '@/lib/pricing'

describe('getEffectiveUnitPrice', () => {
  test('falls back to product default', async () => {
    const db = {
      priceBookEntry: { findFirst: jest.fn().mockResolvedValue(null) },
      product: { findUnique: jest.fn().mockResolvedValue({ defaultPrice: 1234 }) },
    }
    const price = await getEffectiveUnitPrice(db as any, 'prod1')
    expect(price).toBe(1234)
  })

  test('uses global over default', async () => {
    const db = {
      priceBookEntry: { findFirst: jest.fn()
        .mockResolvedValueOnce({ unitPrice: 555 }) // global (first call since no customer/role)
      },
      product: { findUnique: jest.fn() },
    }
    const price = await getEffectiveUnitPrice(db as any, 'prod1', {})
    expect(price).toBe(555)
  })

  test('customer overrides role/global', async () => {
    const db = {
      priceBookEntry: { findFirst: jest.fn()
        .mockResolvedValueOnce({ unitPrice: 111 }) // customer
      },
      product: { findUnique: jest.fn() },
    }
    const price = await getEffectiveUnitPrice(db as any, 'prod1', { customerId: 'c1', roleId: 'r1' })
    expect(price).toBe(111)
  })
})
