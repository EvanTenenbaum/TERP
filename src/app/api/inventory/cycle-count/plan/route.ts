import { api } from '@/lib/api'
import { NextResponse } from 'next/server'
import { createABCPlan } from '@/lib/cycleCount'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'], parseJson: true })(async ({ json }) => {
  const id = await createABCPlan((json as any)?.name ?? 'Cycle Plan')
  return NextResponse.json({ id })
})
