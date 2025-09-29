import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import { getCatalog } from '@/lib/analytics/catalog'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'analytics-catalog', limit: 120 } })(async () => {
  const data = await getCatalog()
  return ok({ data })
})
