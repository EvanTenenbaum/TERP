import { api } from '@/lib/api'
import { NextResponse } from 'next/server'
import { submitCount } from '@/lib/cycleCount'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'], parseJson: true })(async ({ params, json }) => {
  await submitCount((params as any).id, Number((json as any).countedQty))
  return NextResponse.json({ ok: true })
})
