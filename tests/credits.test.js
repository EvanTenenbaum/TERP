/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('Customer Credits & Credit Memos', () => {
  let customer, ar
  beforeAll(async () => {
    customer = await prisma.customer.create({ data: { companyName:'CC Co', contactInfo:{} } })
    ar = await prisma.accountsReceivable.create({ data: { customerId: customer.id, invoiceNumber: `AR-${Date.now()}`, invoiceDate: new Date(), dueDate: new Date(Date.now()+7*86400000), amount: 10000, balanceRemaining: 10000 } })
  })
  afterAll(async () => {
    await prisma.creditMemo.deleteMany({ where: { arId: ar.id } })
    await prisma.customerCredit.deleteMany({ where: { customerId: customer.id } })
    await prisma.accountsReceivable.delete({ where: { id: ar.id } })
    await prisma.customer.delete({ where: { id: customer.id } })
  })

  test('create credit memo and top-up customer credit', async () => {
    const mod = require('../src/app/api/finance/credits/memos/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/finance/credits/memos', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ arId: ar.id, amountCents: 1500, reason:'damage' }) }))
    expect(res.status).toBe(200)
    const credits = await prisma.customerCredit.findMany({ where: { customerId: customer.id } })
    expect(credits.length).toBe(1)
    expect(credits[0].balanceCents).toBeGreaterThanOrEqual(1500)
  })

  test('apply credit to AR', async () => {
    const credit = await prisma.customerCredit.findFirst({ where: { customerId: customer.id } })
    const mod = require('../src/app/api/finance/credits/apply/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/finance/credits/apply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ arId: ar.id, creditId: credit.id, amountCents: 500 }) }))
    expect(res.status).toBe(200)
    const updatedAr = await prisma.accountsReceivable.findUnique({ where: { id: ar.id } })
    expect(updatedAr.balanceRemaining).toBeLessThan(10000)
  })
})
