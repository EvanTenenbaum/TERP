/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('Low Stock Replenishment', () => {
  let vendor, pLow, pOk
  beforeAll(async () => {
    vendor = await prisma.vendor.create({ data: { vendorCode:`LS-${Date.now()}`, companyName:'LS Vendor', contactInfo:{} } })
    pLow = await prisma.product.create({ data: { sku:`LS1-${Date.now()}`, name:'Low', category:'Cat', unit:'each', defaultPrice:1000, isActive:true } })
    pOk = await prisma.product.create({ data: { sku:`LS2-${Date.now()}`, name:'Ok', category:'Cat', unit:'each', defaultPrice:1000, isActive:true } })
    const b1 = await prisma.batch.create({ data: { productId: pLow.id, vendorId: vendor.id, lotNumber: `LSL-${Date.now()}`, receivedDate: new Date(), quantityReceived: 2, quantityAvailable: 2 } })
    const b2 = await prisma.batch.create({ data: { productId: pOk.id, vendorId: vendor.id, lotNumber: `LSH-${Date.now()}`, receivedDate: new Date(), quantityReceived: 20, quantityAvailable: 20 } })
    await prisma.inventoryLot.create({ data: { batchId: b1.id, quantityOnHand:2, quantityAllocated:0, quantityAvailable:2, reservedQty:0, lastMovementDate: new Date() } })
    await prisma.inventoryLot.create({ data: { batchId: b2.id, quantityOnHand:20, quantityAllocated:0, quantityAvailable:20, reservedQty:0, lastMovementDate: new Date() } })
  })
  afterAll(async () => {
    await prisma.inventoryLot.deleteMany({ where: { batch: { vendorId: vendor.id } } })
    await prisma.batch.deleteMany({ where: { vendorId: vendor.id } })
    await prisma.product.deleteMany({ where: { id: { in: [pLow.id, pOk.id] } } })
    await prisma.vendor.delete({ where: { id: vendor.id } })
  })

  test('preview lists low items', async () => {
    const mod = require('../src/app/api/alerts/replenishment/preview/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/alerts/replenishment/preview', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ thresholdDefault: 5 }) }))
    expect(res.status).toBe(200)
    const j = await res.json()
    const ids = j.data.items.map((i)=>i.productId)
    expect(ids).toContain(pLow.id)
    expect(ids).not.toContain(pOk.id)
  })

  test('apply creates events', async () => {
    const mod = require('../src/app/api/alerts/replenishment/apply/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/alerts/replenishment/apply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ productIds: [pLow.id] }) }))
    expect(res.status).toBe(200)
  })
})
