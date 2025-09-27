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
