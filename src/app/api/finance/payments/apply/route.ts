import { api } from '@/lib/api'
import { NextResponse } from 'next/server'
import { ApplyPaymentBody } from '@/lib/schemas/finance'
import { applyPaymentFIFO } from '@/actions/finance'

export const POST = api({
  roles: ['ACCOUNTING','SUPER_ADMIN'],
  postingLock: true,
  rate: { key: 'apply-payment', limit: 60 },
  parseJson: true,
  bodySchema: ApplyPaymentBody,
})(async ({ json }) => {
  const out = await applyPaymentFIFO(json.customerId, json.amountCents, json.method, json.reference)
  return NextResponse.json(out)
})
