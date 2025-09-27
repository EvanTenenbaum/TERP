import { getEffectiveUnitPrice } from '../src/lib/pricing'

describe('getEffectiveUnitPrice precedence', () => {
  const now = new Date()
  const mkDb = (opts: { customerPrice?: number; rolePrice?: number; globalPrice?: number; defaultPrice?: number }) => {
    return {
      priceBookEntry: {
        findFirst: jest.fn(async ({ where }: any) => {
          const t = where?.priceBook?.type
          if (t === 'CUSTOMER' && opts.customerPrice != null) return { unitPrice: opts.customerPrice, effectiveDate: now }
          if (t === 'ROLE' && opts.rolePrice != null) return { unitPrice: opts.rolePrice, effectiveDate: now }
          if (t === 'GLOBAL' && opts.globalPrice != null) return { unitPrice: opts.globalPrice, effectiveDate: now }
          return null
        })
      },
      product: {
        findUnique: jest.fn(async () => ({ defaultPrice: opts.defaultPrice ?? 12345 }))
      }
    }
  }

  it('uses customer price when available', async () => {
    const db = mkDb({ customerPrice: 100, rolePrice: 200, globalPrice: 300, defaultPrice: 400 })
    await expect(getEffectiveUnitPrice(db as any, 'p1', { customerId: 'c1', roleId: 'r1' })).resolves.toBe(100)
  })

  it('falls back to role price when no customer price', async () => {
    const db = mkDb({ rolePrice: 200, globalPrice: 300, defaultPrice: 400 })
    await expect(getEffectiveUnitPrice(db as any, 'p1', { roleId: 'r1' })).resolves.toBe(200)
  })

  it('falls back to global price when no role price', async () => {
    const db = mkDb({ globalPrice: 300, defaultPrice: 400 })
    await expect(getEffectiveUnitPrice(db as any, 'p1')).resolves.toBe(300)
  })

  it('falls back to default price when no price books', async () => {
    const db = mkDb({ defaultPrice: 400 })
    await expect(getEffectiveUnitPrice(db as any, 'p1')).resolves.toBe(400)
  })
})
