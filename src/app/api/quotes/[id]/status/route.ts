import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return NextResponse.json({ success: false, error: 'posting_locked' }, { status: 423 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:quotes-status`, 120, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  try {
    const body = await req.json()
    const { status } = body || {}
    if (!['DRAFT','SENT','ACCEPTED','EXPIRED','CANCELLED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'invalid_status' }, { status: 400 })
    }
    const quote = await prisma.salesQuote.update({ where: { id: params.id }, data: { status } })
    return NextResponse.json({ success: true, quote })
  } catch (err) {
    console.error('update quote status api error', err)
    Sentry.captureException(err)
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 })
  }
}
