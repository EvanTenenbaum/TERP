import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  const rl = rateLimit(`${rateKeyFromRequest(req as any)}:replenishment-apply`, 60, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)
  const body = await req.json().catch(()=>null)
  if (!body) return err('bad_json', 400)
  const arr = Array.isArray(body.productIds) ? body.productIds : []
  const ids: string[] = arr.filter((v:any)=> typeof v === 'string' && v.trim()).map((v:any)=> String(v))
  if (!ids.length) return err('no_productIds', 400)
  const user = getCurrentUserId()

  await prisma.eventLog.createMany({ data: ids.map(id => ({ eventType: 'replenishment.suggest', data: { productId: id, by: user } })) })
  return ok()
}
