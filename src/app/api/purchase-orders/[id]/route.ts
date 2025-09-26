import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({})(async (_ctx, context?: any) => {
  const params = (context?.params || _ctx.params) as { id: string }
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { vendor: true, items: { include: { product: true } } } })
  if (!po) return new Response(JSON.stringify({ success: false, error: 'not_found' }), { status: 404, headers: { 'Content-Type':'application/json' } })
  return new Response(JSON.stringify({ success: true, purchaseOrder: po }), { headers: { 'Content-Type':'application/json' } })
})

export const PATCH = api<{ status?: string; expectedAt?: string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'po-update', limit: 120 },
  parseJson: true,
})(async ({ json, params }) => {
  const { status, expectedAt } = json || ({} as any)
  const po = await prisma.purchaseOrder.update({ where: { id: params!.id }, data: { status, expectedAt: expectedAt ? new Date(expectedAt) : undefined } })
  return new Response(JSON.stringify({ success: true, purchaseOrder: po }), { headers: { 'Content-Type':'application/json' } })
})
