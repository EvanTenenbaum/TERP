import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { runSelfHeal } from '@/lib/selfHeal'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.ENABLE_QA_CRONS !== 'true') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
  }
  try {
    const { fixes, errors, postingLocked } = await runSelfHeal()
    return NextResponse.json({ ok: true, fixes, errors, postingLocked })
  } catch (e) {
    Sentry.captureException(e)
    return NextResponse.json({ ok: false, error: 'self_heal_failed' }, { status: 500 })
  }
}
