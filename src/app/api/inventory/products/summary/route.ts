import { api } from '@/lib/api'
import { getInventorySummary } from '@/lib/inventoryCache'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'],
  rate: { key: 'inventory-products-summary', limit: 60 },
})(async ({ req }) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const category = searchParams.get('category') || undefined
    const minAvailable = searchParams.get('minAvailable') ? Math.max(0, parseInt(searchParams.get('minAvailable') || '0', 10) || 0) : undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10) || 50
    const pageSize = Math.max(1, Math.min(200, pageSizeRaw))

    const { rows, total } = await getInventorySummary({ q, category, minAvailable, page, pageSize })

    return ok({ data: rows, meta: { total, page, pageSize } })
  } catch (e) {
    return err('server_error', 500)
  }
})
