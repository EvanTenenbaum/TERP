import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'
import { PurchaseOrderCreate } from '@/lib/schemas/purchaseOrder'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const pos = await prisma.purchaseOrder.findMany({ include: { vendor: { include: { party: { select: { name: true } } } }, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } })
  const result = pos.map(po => ({
    ...po,
    vendorDisplayName: po.vendor?.party?.name ?? po.vendor?.vendorCode ?? po.vendor?.companyName ?? ''
  }))
  return ok({ purchaseOrders: result })
})

export const POST = api<{ vendorId:string; expectedAt?:string; poNumber?:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'po-create', limit: 60 },
  parseJson: true,
  bodySchema: PurchaseOrderCreate,
})(async ({ json }) => {
  const { vendorId, expectedAt, poNumber } = json as any
  const count = await prisma.purchaseOrder.count()
  const defaultPo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4,'0')}`
  const po = await prisma.purchaseOrder.create({ data: { vendorId, status: 'OPEN', poNumber: poNumber || defaultPo, expectedAt: expectedAt ? new Date(expectedAt) : null } as any })
  return ok({ purchaseOrder: po })
})
