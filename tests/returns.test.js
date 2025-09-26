/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('Inventory Returns API', () => {
  let vendor, product, batch, lot

  beforeAll(async () => {
    vendor = await prisma.vendor.create({ data: { vendorCode:`VR-${Date.now()}`, companyName:'Vendor R', contactInfo:{} } })
    product = await prisma.product.create({ data: { sku:`R-${Date.now()}`, name:'Returned', category:'Cat', unit:'each', defaultPrice:1000, isActive:true } })
    batch = await prisma.batch.create({ data: { productId: product.id, vendorId: vendor.id, lotNumber: `RL-${Date.now()}`, receivedDate: new Date(), quantityReceived: 10, quantityAvailable: 10 } })
    lot = await prisma.inventoryLot.create({ data: { batchId: batch.id, quantityOnHand:10, quantityAllocated:0, quantityAvailable:10, reservedQty:0, lastMovementDate: new Date() } })
  })

  afterAll(async () => {
    await prisma.writeOffLedger.deleteMany({ where: { lotId: lot.id } })
    await prisma.sampleTransaction.deleteMany({ where: { batchId: batch.id } })
    await prisma.inventoryLot.deleteMany({ where: { batchId: batch.id } })
    await prisma.batch.deleteMany({ where: { id: batch.id } })
    await prisma.product.delete({ where: { id: product.id } })
    await prisma.vendor.delete({ where: { id: vendor.id } })
  })

  test('customer return increases stock', async () => {
    const mod = require('../src/app/api/inventory/returns/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/inventory/returns', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type:'customer', lotId: lot.id, quantity: 2 }) }))
    expect(res.status).toBe(200)
    const updated = await prisma.inventoryLot.findUnique({ where: { id: lot.id } })
    expect(updated.quantityOnHand).toBe(12)
  })

  test('vendor return decreases with writeoff', async () => {
    const mod = require('../src/app/api/inventory/returns/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/inventory/returns', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type:'vendor', lotId: lot.id, quantity: 3 }) }))
    expect(res.status).toBe(200)
    const updated = await prisma.inventoryLot.findUnique({ where: { id: lot.id } })
    expect(updated.quantityOnHand).toBe(9)
  })

  test('insufficient_on_hand prevented', async () => {
    const mod = require('../src/app/api/inventory/returns/route.ts')
    const res = await mod.POST(new Request('http://localhost/api/inventory/returns', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ type:'vendor', lotId: lot.id, quantity: 999 }) }))
    expect(res.status).toBe(409)
  })

  test('export csv returns data', async () => {
    const mod = require('../src/app/api/inventory/returns/export/route.ts')
    const res = await mod.GET(new Request(`http://localhost/api/inventory/returns/export?lotId=${lot.id}`))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch('type,batchId,lotId,quantity,when,reason')
  })
})
