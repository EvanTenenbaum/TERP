import { api } from '@/lib/api'
import { NextResponse } from 'next/server'
import { applyDiscrepancy } from '@/lib/cycleCount'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING'] })(async ({ params }) => {
  await applyDiscrepancy((params as any).id)
  return NextResponse.json({ ok: true })
})
