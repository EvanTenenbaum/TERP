import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ productIds: string[] }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'replenishment-apply', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const arr = Array.isArray(json!.productIds) ? json!.productIds : []
  const ids: string[] = arr.filter((v:any)=> typeof v === 'string' && v.trim()).map((v:any)=> String(v))
  if (!ids.length) return err('no_productIds', 400)
  const user = getCurrentUserId()
  await prisma.eventLog.createMany({ data: ids.map(id => ({ eventType: 'replenishment.suggest', data: { productId: id, by: user } })) })
  return ok()
})
