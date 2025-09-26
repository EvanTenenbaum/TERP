import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req as any)}:replenishment-apply`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success:false, error:'rate_limited' }, { status:429 })
  const body = await req.json().catch(()=>null)
  if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status:400 })
  const arr = Array.isArray(body.productIds) ? body.productIds : []
  const ids: string[] = arr.filter((v:any)=> typeof v === 'string' && v.trim()).map((v:any)=> String(v))
  if (!ids.length) return NextResponse.json({ success:false, error:'no_productIds' }, { status:400 })
  const user = getCurrentUserId()

  await prisma.eventLog.createMany({ data: ids.map(id => ({ eventType: 'replenishment.suggest', data: { productId: id, by: user } })) })
  return NextResponse.json({ success:true })
}
