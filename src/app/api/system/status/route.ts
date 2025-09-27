import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const s = await (prisma as any).systemStatus?.findUnique?.({ where: { id: 'singleton' } })
    return NextResponse.json({ postingLocked: !!s?.postingLocked, lastReason: s?.lastReason ?? null })
  } catch {
    return NextResponse.json({ postingLocked: false, lastReason: null })
  }
}
