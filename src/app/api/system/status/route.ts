import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export async function GET() {
  try {
    const s = await (prisma as any).systemStatus?.findUnique?.({ where: { id: 'singleton' } })
    return NextResponse.json({ postingLocked: !!s?.postingLocked, lastReason: s?.lastReason ?? null })
  } catch {
    return NextResponse.json({ postingLocked: false, lastReason: null })
  }
}

export const PATCH = api<{ postingLocked?: boolean; reason?: string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: false,
  parseJson: true,
  rate: { key: 'system-status-update', limit: 30 }
})(async ({ json }) => {
  if (!json) return err('bad_json', 400)
  const postingLocked = json.postingLocked ?? false
  const lastReason = json.reason ?? null
  const s = await (prisma as any).systemStatus?.upsert?.({
    where: { id: 'singleton' },
    update: { postingLocked, lastReason },
    create: { id: 'singleton', postingLocked, lastReason },
  })
  return ok({ postingLocked: !!s?.postingLocked, lastReason: s?.lastReason ?? null })
})
