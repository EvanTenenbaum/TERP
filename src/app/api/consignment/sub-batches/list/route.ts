import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'],
  rate: { key: 'consignment-sub-batch-list', limit: 60 },
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batchId') || undefined
  const vendorId = searchParams.get('vendorId') || undefined

  const where: any = {}
  if (batchId) where.batchId = batchId
  if (vendorId) where.batch = { vendorId }

  try {
    const subBatches = await (prisma as any).subBatch.findMany({
      where,
      include: { batch: { include: { vendor: true, product: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ data: subBatches })
  } catch {
    return err('server_error', 500)
  }
})
