import { api } from '@/lib/api'
import { NextResponse } from 'next/server'
import { recomputeCustomerRanking } from '@/lib/ranking'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING'] })(async () => {
  await recomputeCustomerRanking()
  return NextResponse.json({ ok: true })
})
