jest.mock('@/lib/prisma', () => {
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
  const prisma = { $transaction: async (fn: any) => fn(tx) } as any
  ;(prisma as any).__calls = calls
  ;(prisma as any).__arRecord = arRecord
  return { __esModule: true, default: prisma }
})

describe('finance.applyPayment', () => {
  it('applies payment and decrements AR balance', async () => {
    const mod = await import('@/actions/finance')
    const prismaMod: any = await import('@/lib/prisma')
    const res = await mod.applyPayment('p1', 'ar1', 400)
    expect(res.success).toBe(true)
    expect(prismaMod.default.__arRecord.balanceRemaining).toBe(600)
    expect(prismaMod.default.__calls[0][0]).toBe('pa.create')
    expect(prismaMod.default.__calls[1][0]).toBe('ar.update')
  })
})
