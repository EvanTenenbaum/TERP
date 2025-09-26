const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function ensurePartyForVendor(v) {
  if (v.partyId) return v.partyId
  const p = await prisma.party.create({ data: { name: v.companyName, isVendor: true, isActive: v.isActive, contactInfo: v.contactInfo || {} } })
  await prisma.vendor.update({ where: { id: v.id }, data: { partyId: p.id } })
  return p.id
}

async function ensurePartyForCustomer(c) {
  if (c.partyId) return c.partyId
  const p = await prisma.party.create({ data: { name: c.companyName, isCustomer: true, isActive: c.isActive, contactInfo: c.contactInfo || {} } })
  await prisma.customer.update({ where: { id: c.id }, data: { partyId: p.id } })
  return p.id
}

async function main() {
  console.log('Backfilling Parties...')
  const vendors = await prisma.vendor.findMany({})
  for (const v of vendors) {
    await ensurePartyForVendor(v)
  }
  const customers = await prisma.customer.findMany({})
  for (const c of customers) {
    await ensurePartyForCustomer(c)
  }
  console.log('Done.')
}

main().then(()=>prisma.$disconnect()).catch((e)=>{ console.error(e); return prisma.$disconnect().finally(()=>process.exit(1)) })
