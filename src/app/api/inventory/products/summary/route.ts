import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { getInventorySummary } from '@/lib/inventoryCache'

export async function GET(req: Request) {
  try {
    try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
    const rl = rateLimit(`${rateKeyFromRequest(req as any)}:inventory-products-summary`, 60, 60_000)
    if (!rl.allowed) return NextResponse.json({ success:false, error:'rate_limited' }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const category = searchParams.get('category') || undefined
    const minAvailable = searchParams.get('minAvailable') ? Math.max(0, parseInt(searchParams.get('minAvailable') || '0', 10) || 0) : undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10) || 50
    const pageSize = Math.max(1, Math.min(200, pageSizeRaw))

    const { rows, total } = await getInventorySummary({ q, category, minAvailable, page, pageSize })

    return NextResponse.json({ success: true, data: rows, meta: { total, page, pageSize } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
