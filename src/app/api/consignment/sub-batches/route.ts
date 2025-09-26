import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ batchId:string; tierName:string; qtyAllocated:number; unitCostOverrideCents?:number }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'consignment-sub-batch-create', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { batchId, tierName, qtyAllocated, unitCostOverrideCents } = json as any
  if (!batchId || !tierName || !Number.isFinite(qtyAllocated) || qtyAllocated <= 0) return err('invalid_input', 400)

  try {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return err('batch_not_found', 404)
    if (!batch.isConsignment) return err('not_consignment_batch', 400)

    const subBatch = await (prisma as any).subBatch.create({
      data: {
        batchId,
        tierName: String(tierName).slice(0,128),
        qtyAllocated,
        unitCostOverrideCents: unitCostOverrideCents ?? undefined,
      },
    })

    return ok({ data: subBatch })
  } catch {
    return err('server_error', 500)
  }
})
