import prisma from '@/lib/prisma'

export type InventoryIntakeGroup = {
  date: string
  onHand: number
  allocated: number
  available: number
  batchCount: number
}

export type InventorySummaryRow = {
  productId: string
  sku: string
  name: string
  category: string | null
  defaultPrice: number
  totals: { onHand: number; allocated: number; available: number }
  intake: { latest: string | null; oldest: string | null; groups: InventoryIntakeGroup[] }
}

export type InventorySummaryParams = {
  q?: string
  category?: string
  minAvailable?: number
  page?: number
  pageSize?: number
}

type CacheEntry = { data: InventorySummaryRow[]; builtAt: number; paramsKey: string }

const CACHE_TTL_MS = 60_000 // 1 minute default TTL to balance freshness and cost
let cache: CacheEntry | null = null

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function paramsKey(p: InventorySummaryParams): string {
  const { q = '', category = '', minAvailable = 0, page = 1, pageSize = 50 } = p
  return JSON.stringify({ q: q.trim().toLowerCase(), category, minAvailable, page, pageSize })
}

export async function getInventorySummary(params: InventorySummaryParams = {}): Promise<{ rows: InventorySummaryRow[]; total: number; page: number; pageSize: number }> {
  const key = paramsKey(params)
  const now = Date.now()
  if (cache && cache.paramsKey === key && now - cache.builtAt < CACHE_TTL_MS) {
    const start = ((params.page || 1) - 1) * (params.pageSize || 50)
    const end = start + (params.pageSize || 50)
    return { rows: cache.data.slice(start, end), total: cache.data.length, page: params.page || 1, pageSize: params.pageSize || 50 }
  }

  const { q, category, minAvailable = 0, page = 1, pageSize = 50 } = params

  const where: any = { isActive: true }
  if (q && q.trim()) {
    const qt = q.trim()
    where.OR = [
      { name: { contains: qt, mode: 'insensitive' as const } },
      { sku: { contains: qt, mode: 'insensitive' as const } },
    ]
  }
  if (category && category.trim()) {
    where.category = { equals: category.trim() }
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, sku: true, name: true, category: true, defaultPrice: true,
      batches: {
        select: {
          id: true,
          receivedDate: true,
          inventoryLot: { select: { quantityOnHand: true, quantityAllocated: true, quantityAvailable: true, reservedQty: true } }
        }
      }
    },
    orderBy: { sku: 'asc' }
  })

  const rowsAll: InventorySummaryRow[] = products.map(p => {
    let onHand = 0
    let allocated = 0
    let available = 0
    let latestIntake: Date | null = null
    let oldestIntake: Date | null = null
    const intakeGroups: Record<string, InventoryIntakeGroup> = {}

    for (const b of p.batches) {
      const lot = b.inventoryLot
      const qOnHand = lot?.quantityOnHand ?? 0
      const qAlloc = lot?.quantityAllocated ?? 0
      const qAvail = Math.max(0, (lot?.quantityAvailable ?? 0) - (lot?.reservedQty ?? 0))
      onHand += qOnHand
      allocated += qAlloc
      available += qAvail
      const d = b.receivedDate
      if (d) {
        latestIntake = !latestIntake || d.getTime() > (latestIntake as Date).getTime() ? d : latestIntake
        oldestIntake = !oldestIntake || d.getTime() < (oldestIntake as Date).getTime() ? d : oldestIntake
        const key = toISODate(d)
        const g = intakeGroups[key] || { date: key, onHand: 0, allocated: 0, available: 0, batchCount: 0 }
        g.onHand += qOnHand
        g.allocated += qAlloc
        g.available += qAvail
        g.batchCount += 1
        intakeGroups[key] = g
      }
    }

    const groups = Object.values(intakeGroups).sort((a,b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
    return {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      defaultPrice: p.defaultPrice,
      totals: { onHand, allocated, available },
      intake: {
        latest: latestIntake ? latestIntake.toISOString() : null,
        oldest: oldestIntake ? oldestIntake.toISOString() : null,
        groups
      }
    }
  })

  const filtered = rowsAll.filter(r => r.totals.available >= (minAvailable || 0))
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageRows = filtered.slice(start, end)

  cache = { data: filtered, builtAt: now, paramsKey: key }
  return { rows: pageRows, total: filtered.length, page, pageSize }
}

export function invalidateInventorySummaryCache() {
  cache = null
}
