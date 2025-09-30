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
})(async ({ json, params }) => {
  const { status: newStatus, expectedAt } = json || ({} as any)
  const po = await prisma.purchaseOrder.update({ where: { id: params!.id }, data: { status: newStatus, expectedAt: expectedAt ? new Date(expectedAt) : undefined } })
  return ok({ purchaseOrder: po })
})
