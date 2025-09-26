import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const body = await req.json().catch(()=>null)
  if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status:400 })
  const ids: string[] = Array.isArray(body.productIds) ? body.productIds : []
  if (!ids.length) return NextResponse.json({ success:false, error:'no_productIds' }, { status:400 })
  const user = getCurrentUserId()

  await prisma.eventLog.createMany({ data: ids.map(id => ({ eventType: 'replenishment.suggest', data: { productId: id, by: user } })) })
  return NextResponse.json({ success:true })
}
