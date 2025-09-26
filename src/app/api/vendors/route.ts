import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({})(async () => {
  const vendors = await prisma.vendor.findMany({ where: { isActive: true }, orderBy: { companyName: 'asc' } })
  return new Response(JSON.stringify({ success: true, vendors }), { headers: { 'Content-Type':'application/json' } })
})
