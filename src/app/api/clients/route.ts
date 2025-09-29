import { NextResponse } from 'next/server'
import { createClient } from '@/actions/clients'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await createClient(body)
    if (!res.success) return NextResponse.json(res, { status: 400 })
    return NextResponse.json(res)
  } catch (e) {
    return NextResponse.json({ success: false, error: 'invalid_request' }, { status: 400 })
  }
}
