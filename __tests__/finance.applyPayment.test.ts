import { applyPayment } from '@/actions/finance'

describe('finance.applyPayment', () => {
  it('applies payment and decrements AR balance', async () => {
    const calls: any[] = []
    const arRecord = { id: 'ar1', balanceRemaining: 1000 }
    const tx = {
      accountsReceivable: {
        findUnique: async ({ where }: any) => (where.id === 'ar1' ? arRecord : null),
        update: async ({ where, data }: any) => { calls.push(['ar.update', where.id, data]); arRecord.balanceRemaining -= data.balanceRemaining.decrement; return arRecord },
      },
      paymentApplication: {
        create: async ({ data }: any) => { calls.push(['pa.create', data]); return { id: 'pa1', ...data } },
      },
    } as any

    const prisma = {
      $transaction: async (fn: any) => fn(tx),
    } as any

    jest.mock('@/lib/prisma', () => prisma)

    const mod = await import('@/actions/finance')
    const res = await mod.applyPayment('p1', 'ar1', 400)
    expect(res.success).toBe(true)
    expect(arRecord.balanceRemaining).toBe(600)
    expect(calls[0][0]).toBe('pa.create')
    expect(calls[1][0]).toBe('ar.update')
  })
})
