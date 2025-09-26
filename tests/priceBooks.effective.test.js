/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default

describe('Price Books Effective', () => {
  let product, customer
  beforeAll(async () => {
    product = await prisma.product.create({ data: { sku:`PB-${Date.now()}`, name:'PB Prod', category:'Cat', unit:'each', defaultPrice:999, isActive:true } })
    customer = await prisma.customer.create({ data: { companyName:'CustCo', contactInfo:{} } })
    const globalPB = await prisma.priceBook.create({ data: { name:'Global', type:'GLOBAL', effectiveDate:new Date(Date.now()-10*86400000), isActive:true } })
    const rolePB = await prisma.priceBook.create({ data: { name:'Sales', type:'ROLE', roleId:'SALES', effectiveDate:new Date(Date.now()-5*86400000), isActive:true } })
    const custPB = await prisma.priceBook.create({ data: { name:'Cust', type:'CUSTOMER', customerId: customer.id, effectiveDate:new Date(Date.now()-2*86400000), isActive:true } })
    await prisma.priceBookEntry.create({ data: { priceBookId: globalPB.id, productId: product.id, unitPrice: 1500, effectiveDate: new Date(Date.now()-9*86400000) } })
    await prisma.priceBookEntry.create({ data: { priceBookId: rolePB.id, productId: product.id, unitPrice: 1200, effectiveDate: new Date(Date.now()-4*86400000) } })
    await prisma.priceBookEntry.create({ data: { priceBookId: custPB.id, productId: product.id, unitPrice: 1000, effectiveDate: new Date(Date.now()-1*86400000) } })
  })
  afterAll(async () => {
    await prisma.priceBookEntry.deleteMany({ where: { productId: product.id } })
    await prisma.priceBook.deleteMany({ where: {} })
    await prisma.customer.delete({ where: { id: customer.id } })
    await prisma.product.delete({ where: { id: product.id } })
  })

  test('picks customer > role > global', async () => {
    const mod = require('../src/app/api/price-books/effective/route.ts')
    const res = await mod.GET(new Request(`http://localhost/api/price-books/effective?productId=${product.id}&customerId=${customer.id}&role=SALES`))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.success).toBe(true)
    expect(j.data.unitPriceCents).toBe(1000)
    expect(j.data.source).toBe('CUSTOMER')
  })

  test('falls back to role then global', async () => {
    const mod = require('../src/app/api/price-books/effective/route.ts')
    const res = await mod.GET(new Request(`http://localhost/api/price-books/effective?productId=${product.id}&role=SALES`))
    const j = await res.json()
    expect(j.data.unitPriceCents).toBe(1200)
    expect(j.data.source).toBe('ROLE')
  })
})
