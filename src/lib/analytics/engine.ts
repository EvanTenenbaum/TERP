import prisma from '@/lib/prisma'
import { ReportSpec } from '@/lib/analytics/validation'

function parseDateRange(dr: ReportSpec['dateRange']): { from?: Date; to?: Date } {
  if (dr.mode === 'absolute') return { from: new Date(dr.from), to: new Date(dr.to) }
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (dr.value) {
    case 'today': return { from: startOfToday, to: now }
    case '7d': return { from: new Date(now.getTime() - 7*86400000), to: now }
    case '30d': return { from: new Date(now.getTime() - 30*86400000), to: now }
    case 'qtd': {
      const q = Math.floor(now.getMonth()/3)
      const start = new Date(now.getFullYear(), q*3, 1)
      return { from: start, to: now }
    }
    case 'ytd': return { from: new Date(now.getFullYear(), 0, 1), to: now }
  }
}

function applyFilters(where: any, spec: ReportSpec) {
  for (const f of spec.filters) {
    const val = Array.isArray(f.value) ? f.value : [f.value]
    if (f.field === 'customerId') where.customerId = { in: val as string[] }
    if (f.field === 'vendorId') where.vendorId = { in: val as string[] }
    if (f.field === 'productId') where.productId = { in: val as string[] }
  }
}

export async function evaluate(spec: ReportSpec) {
  const { from, to } = parseDateRange(spec.dateRange)
  const metric = spec.metric

  if (metric === 'sales_total') {
    const where: any = {}
    if (from || to) where.orderDate = { gte: from, lte: to }
    applyFilters(where, spec)
    const agg = await prisma.order.aggregate({ _sum: { totalAmount: true }, where })
    const amount = agg._sum.totalAmount || 0
    return { rows: [{ label: 'Sales Total', amountCents: amount }], meta: { rowCount: 1, viz: 'kpi', recommendedViz: 'kpi' as const } }
  }

  if (metric === 'sales_by_customer') {
    const where: any = {}
    if (from || to) where.orderDate = { gte: from, lte: to }
    applyFilters(where, spec)
    const rows = await prisma.order.groupBy({ by: ['customerId'], _sum: { totalAmount: true }, where, orderBy: { _sum: { totalAmount: 'desc' } }, take: spec.limit ?? 50 })
    const customers = await prisma.customer.findMany({ where: { id: { in: rows.map(r => r.customerId) } }, select: { id:true, companyName:true } })
    const nameById = Object.fromEntries(customers.map(c => [c.id, c.companyName]))
    return { rows: rows.map(r => ({ customerId: r.customerId, customer: nameById[r.customerId] || r.customerId, amountCents: r._sum.totalAmount || 0 })), meta: { rowCount: rows.length, viz: 'bar', recommendedViz: 'bar' as const } }
  }

  if (metric === 'sales_by_product') {
    const where: any = {}
    if (from || to) where.createdAt = { gte: from, lte: to }
    applyFilters(where, spec)
    const rows = await prisma.orderItem.groupBy({ by: ['productId'], _sum: { cogsTotalCents: true, quantity: true, unitPrice: true }, where, orderBy: { _sum: { quantity: 'desc' } }, take: spec.limit ?? 50 })
    const products = await prisma.product.findMany({ where: { id: { in: rows.map(r => r.productId) } }, select: { id:true, name:true } })
    const nameById = Object.fromEntries(products.map(p => [p.id, p.name]))
    const data = rows.map(r => ({ productId: r.productId, product: nameById[r.productId] || r.productId, quantity: r._sum.quantity || 0, amountCents: (r._sum.quantity || 0) * (r._sum.unitPrice || 0) }))
    return { rows: data, meta: { rowCount: data.length, viz: 'bar', recommendedViz: 'bar' as const } }
  }

  if (metric === 'ar_over_90') {
    const where: any = { balanceRemaining: { gt: 0 } }
    const now = new Date()
    const cutoff = new Date(now.getTime() - 90*86400000)
    where.dueDate = { lt: cutoff }
    applyFilters(where, spec)
    const agg = await prisma.accountsReceivable.aggregate({ _sum: { balanceRemaining: true }, where })
    return { rows: [{ label: 'AR > 90 Days', amountCents: agg._sum.balanceRemaining || 0 }], meta: { rowCount: 1, viz: 'kpi', recommendedViz: 'kpi' as const } }
  }

  if (metric === 'ar_aging_buckets') {
    const rows = await prisma.accountsReceivable.findMany({ where: { balanceRemaining: { gt: 0 } }, select: { id:true, dueDate:true, balanceRemaining:true } })
    const now = new Date().getTime()
    const buckets = { '0-30':0, '31-60':0, '61-90':0, '>90':0 }
    for (const r of rows) {
      const days = Math.floor((now - new Date(r.dueDate).getTime())/86400000)
      if (days <= 30) buckets['0-30'] += r.balanceRemaining
      else if (days <= 60) buckets['31-60'] += r.balanceRemaining
      else if (days <= 90) buckets['61-90'] += r.balanceRemaining
      else buckets['>90'] += r.balanceRemaining
    }
    const data = Object.entries(buckets).map(([bucket, amountCents]) => ({ bucket, amountCents }))
    return { rows: data, meta: { rowCount: data.length, viz: 'bar', recommendedViz: 'bar' as const } }
  }

  if (metric === 'inventory_qty_by_category') {
    const lots = await prisma.inventoryLot.findMany({ include: { batch: { include: { product: true } } } })
    const byCat: Record<string, number> = {}
    for (const lot of lots) {
      const cat = lot.batch.product.category || 'Uncategorized'
      byCat[cat] = (byCat[cat] || 0) + lot.quantityAvailable
    }
    const data = Object.entries(byCat).map(([category, quantity]) => ({ category, quantity }))
    return { rows: data, meta: { rowCount: data.length, viz: 'bar', recommendedViz: 'bar' as const } }
  }

  if (metric === 'inventory_turns') {
    const now = new Date()
    const from1y = new Date(now.getTime() - 365*86400000)
    const shipped = await prisma.orderItem.aggregate({ _sum: { quantity: true }, where: { createdAt: { gte: from1y, lte: now } } })
    const lots = await prisma.inventoryLot.findMany({ select: { quantityOnHand: true, quantityAllocated: true } })
    const current = lots.reduce((a, l) => a + Math.max(0, l.quantityOnHand - l.quantityAllocated), 0)
    const turns = current > 0 ? (shipped._sum.quantity || 0) / current : 0
    return { rows: [{ label:'Inventory Turns (approx.)', turns }], meta: { rowCount: 1, viz: 'kpi', recommendedViz: 'kpi' as const } }
  }

  return { rows: [], meta: { rowCount: 0, viz: 'table', recommendedViz: 'table' as const } }
}
