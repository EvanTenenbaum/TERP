/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('AP Aging endpoints', () => {
  let vendor, ap1, ap2, ap3, apFuture
  beforeAll(async () => {
    vendor = await prisma.vendor.create({ data: { vendorCode: `V-${Date.now()}`, companyName: 'Aging Vendor', contactInfo: {} } })
    const now = Date.now()
    ap1 = await prisma.accountsPayable.create({ data: { vendorId: vendor.id, invoiceNumber: `INV-${now}-1`, invoiceDate: new Date(now-100*86400000), dueDate: new Date(now-10*86400000), amount: 10000, balanceRemaining: 10000 } })
    ap2 = await prisma.accountsPayable.create({ data: { vendorId: vendor.id, invoiceNumber: `INV-${now}-2`, invoiceDate: new Date(now-100*86400000), dueDate: new Date(now-40*86400000), amount: 20000, balanceRemaining: 20000 } })
    ap3 = await prisma.accountsPayable.create({ data: { vendorId: vendor.id, invoiceNumber: `INV-${now}-3`, invoiceDate: new Date(now-100*86400000), dueDate: new Date(now-70*86400000), amount: 30000, balanceRemaining: 30000 } })
    apFuture = await prisma.accountsPayable.create({ data: { vendorId: vendor.id, invoiceNumber: `INV-${now}-F`, invoiceDate: new Date(now), dueDate: new Date(now+10*86400000), amount: 40000, balanceRemaining: 40000 } })
  })
  afterAll(async () => {
    await prisma.accountsPayable.deleteMany({ where: { vendorId: vendor.id } })
    await prisma.vendor.delete({ where: { id: vendor.id } })
  })

  test('JSON buckets and totals', async () => {
    const mod = require('../src/app/api/finance/ap/aging/route.ts')
    const res = await mod.GET(new Request('http://localhost/api/finance/ap/aging'))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.success).toBe(true)
    const rows = j.data.rows
    expect(rows.find(r=>r.invoiceNumber===ap1.invoiceNumber)).toBeTruthy()
    const totals = j.data.totals
    expect(typeof totals['0-29']).toBe('number')
  })

  test('CSV export', async () => {
    const mod = require('../src/app/api/finance/ap/aging.csv/route.ts')
    const res = await mod.GET(new Request('http://localhost/api/finance/ap/aging.csv'))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch('invoiceNumber,vendor,dueDate,balanceCents,daysPastDue,bucket')
  })
})
