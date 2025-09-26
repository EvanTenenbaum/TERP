/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('Audit Log', () => {
  let vendor, product, lot, transfer, settlement
  beforeAll(async () => {
    vendor = await prisma.vendor.create({ data: { vendorCode: `AV-${Date.now()}`, companyName: 'Vendor A', contactInfo: {} } })
    product = await prisma.product.create({ data: { sku:`SKU-${Date.now()}`, name:'Prod', category:'Cat', unit:'each', defaultPrice:1000, isActive:true } })
    const batch = await prisma.batch.create({ data: { productId: product.id, vendorId: vendor.id, lotNumber: `LOT-${Date.now()}`, receivedDate: new Date(), quantityReceived: 10, quantityAvailable: 10 } })
    lot = await prisma.inventoryLot.create({ data: { batchId: batch.id, quantityOnHand:10, quantityAllocated:0, quantityAvailable:10, reservedQty:0, lastMovementDate: new Date() } })
    transfer = await prisma.inventoryTransfer.create({ data: { createdBy: 'tester', productId: product.id, sourceLotId: lot.id, destLotId: null, quantity: 1 } })
    settlement = await prisma.vendorSettlement.create({ data: { vendorId: vendor.id, periodStart: new Date(Date.now()-86400000), periodEnd: new Date(), amount: 1234, createdBy: 'tester' } })
  })
  afterAll(async () => {
    await prisma.vendorSettlement.deleteMany({ where: { vendorId: vendor.id } })
    await prisma.inventoryTransfer.deleteMany({ where: { productId: product.id } })
    await prisma.inventoryLot.deleteMany({ where: { batch: { productId: product.id } } })
    await prisma.batch.deleteMany({ where: { productId: product.id } })
    await prisma.product.delete({ where: { id: product.id } })
    await prisma.vendor.delete({ where: { id: vendor.id } })
  })

  test('returns merged audit items', async () => {
    const mod = require('../src/app/api/audit/route.ts')
    const res = await mod.GET(new Request(`http://localhost/api/audit?entityType=product&entityId=${product.id}`))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.success).toBe(true)
    expect(Array.isArray(j.data)).toBe(true)
    expect(j.data.some(x=>x.type==='inventory.transfer')).toBe(true)
  })
})
