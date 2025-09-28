import { NextResponse } from 'next/server'
import { createProductIntake } from '@/actions/intake'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await createProductIntake(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, product: result.product, batch: result.batch })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'invalid_request' }, { status: 400 })
  }
}
