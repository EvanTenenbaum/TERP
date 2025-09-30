import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'
import { PurchaseOrderUpdate } from '@/lib/schemas/purchaseOrder'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async ({ params }) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params!.id }, include: { vendor: true, items: { include: { product: true } } } })
  if (!po) return err('not_found', 404)
  return ok({ purchaseOrder: po })
})

export const PATCH = api<{ status?: string; expectedAt?: string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'po-update', limit: 120 },
  parseJson: true,
  bodySchema: PurchaseOrderUpdate,
})(async ({ json, params }) => {
  const id = params!.id
  const update: any = {}
  if (json?.expectedAt) update.expectedAt = new Date(json.expectedAt)
  if (json?.status) {
    const current = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } })
    const from = current?.status || 'OPEN'
    const to = json.status
    const allowed: Record<string,string[]> = { OPEN:['APPROVED','CANCELLED'], APPROVED:['CLOSED','CANCELLED'], CLOSED:[], CANCELLED:[] }
    if (!allowed[from]?.includes(to)) return err('invalid_transition', 409)
    update.status = to
  }
  const po = await prisma.purchaseOrder.update({ where: { id }, data: update })
  return ok({ purchaseOrder: po })
})
