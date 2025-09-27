import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({})(async () => {
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    include: { party: { select: { name: true } } },
    orderBy: { companyName: 'asc' }
  })
  const result = vendors.map(v => ({
    ...v,
    displayName: v.party?.name ?? v.companyName,
  }))
  return new Response(JSON.stringify({ success: true, vendors: result }), { headers: { 'Content-Type':'application/json' } })
})

export const PATCH = api<{ id:string; isActive:boolean }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'vendors-update', limit: 60 }, parseJson: true })(async ({ json }) => {
  const id = String(json!.id||'')
  const isActive = Boolean(json!.isActive)
  if (!id) return new Response(JSON.stringify({ success:false, error:'invalid_input' }), { status: 400, headers: { 'Content-Type':'application/json' } })
  const out = await prisma.$transaction(async (tx)=>{
    const v = await tx.vendor.update({ where: { id }, data: { isActive } })
    if (v.partyId) await tx.party.update({ where: { id: v.partyId }, data: { isActive } })
    return v
  })
  return new Response(JSON.stringify({ success: true, vendor: out }), { headers: { 'Content-Type':'application/json' } })
})
