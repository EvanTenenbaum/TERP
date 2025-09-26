import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'],
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const lotId = searchParams.get('lotId') || undefined
  const limit = Number(searchParams.get('limit') || '100')

  const [client, vendor, internal] = await Promise.all([
    prisma.sampleTransaction.findMany({ where: { transactionType: 'CLIENT_RETURN', ...(lotId ? { batchId: (await prisma.inventoryLot.findUnique({ where: { id: lotId } }))?.batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit }),
    prisma.sampleTransaction.findMany({ where: { transactionType: 'VENDOR_RETURN', ...(lotId ? { batchId: (await prisma.inventoryLot.findUnique({ where: { id: lotId } }))?.batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit }),
    prisma.writeOffLedger.findMany({ where: lotId ? { lotId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
  ])

  return ok({ data: { client, vendor, writeoffs: internal } })
})
