import { NextResponse } from 'next/server'
import { getClientProfile } from '@/lib/client/profile'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const partyId = searchParams.get('partyId')
  if (!partyId) return NextResponse.json({ error: 'partyId required' }, { status: 400 })
  const p = await getClientProfile(partyId)
  return NextResponse.json({
    name: p.party.name,
    isCustomer: p.party.isCustomer,
    isVendor: p.party.isVendor,
    arOpenCents: p.quick.arOpenCents,
    apOpenCents: p.quick.apOpenCents,
    consignValueCents: p.quick.consignValueCents,
    lastActivityAt: p.quick.lastActivityAt ?? null,
  })
}
