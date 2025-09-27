import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const customers = await prisma.customer.findMany({ where: { isActive: true }, orderBy: { companyName: 'asc' }, include: { party: true } })
  const result = customers.map(c => ({ ...c, displayName: c.party?.name ?? c.companyName }))
  return ok({ customers: result })
})

export const PATCH = api<{ id:string; isActive:boolean }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'customers-update', limit: 60 }, parseJson: true })(async ({ json }) => {
  const id = String(json!.id||'')
  const isActive = Boolean(json!.isActive)
  if (!id) return err('invalid_input', 400)
  const updated = await prisma.$transaction(async (tx)=>{
    const c = await tx.customer.update({ where: { id }, data: { isActive } })
    if (c.partyId) await tx.party.update({ where: { id: c.partyId }, data: { isActive } })
    return c
  })
  return ok({ customer: updated })
})
