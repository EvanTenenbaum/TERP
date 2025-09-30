import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import KPICard from '@/components/home/KPICard'
import RecentActivity, { ActivityItem } from '@/components/home/RecentActivity'
import { getCurrentRole } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function getProductsTotal(): Promise<number> {
  try {
    return await prisma.product.count()
  } catch {
    return 0
  }
}

async function getLowStockCount(): Promise<number> {
  try {
    const lots = await prisma.inventoryLot.findMany({ include: { batch: { include: { product: true } } } })
    const byProduct: Record<string, { onHand:number; reserved:number }> = {}
    for (const l of lots) {
      const pid = l.batch.product.id
      if (!byProduct[pid]) byProduct[pid] = { onHand:0, reserved:0 }
      byProduct[pid].onHand += l.quantityAvailable
      byProduct[pid].reserved += l.reservedQty || 0
    }
    const threshold = 10
    const count = Object.values(byProduct).reduce((acc, p) => {
      const effective = Math.max(0, p.onHand - p.reserved)
      return acc + (effective < threshold ? 1 : 0)
    }, 0)
    return count
  } catch {
    return 0
  }
}

async function getActiveRulesCount(): Promise<number> {
  try {
    return await prisma.rule.count({ where: { active: true } })
  } catch {
    return 0
  }
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  try {
    const limit = 10
    const [transfers, writeoffs, settlements, rebates, overrides] = await Promise.all([
      prisma.inventoryTransfer.findMany({ orderBy:{ createdAt:'asc' }, take: limit }),
      prisma.writeOffLedger.findMany({ orderBy:{ createdAt:'asc' }, take: limit }),
      prisma.vendorSettlement.findMany({ orderBy:{ createdAt:'asc' }, take: limit }),
      prisma.vendorRebate.findMany({ orderBy:{ createdAt:'asc' }, take: limit }),
      prisma.overrideAudit.findMany({ orderBy:{ timestamp:'asc' }, take: limit }),
    ])
    const items: ActivityItem[] = []
    for (const t of transfers) items.push({ when: t.createdAt, type: 'inventory.transfer', summary: `Transfer ${t.quantity} ${t.sourceLotId} → ${t.destLotId || '-'} for ${t.productId}` })
    for (const w of writeoffs) items.push({ when: w.createdAt, type: 'inventory.writeoff', summary: `Write-off ${w.qty} from lot ${w.lotId} (${w.reason})` })
    for (const s of settlements) items.push({ when: s.createdAt, type: 'ap.settlement', summary: `Vendor settlement ${s.amount} for ${s.vendorId}` })
    for (const r of rebates) items.push({ when: r.createdAt, type: 'ap.rebate', summary: `Vendor rebate ${r.amount} for ${r.vendorId}` })
    for (const o of overrides) items.push({ when: o.timestamp, type: 'override', summary: `Override ${o.oldPrice}→${o.newPrice} (${o.reason})` })
    items.sort((a,b)=> new Date(b.when as any).getTime() - new Date(a.when as any).getTime())
    return items.slice(0, limit)
  } catch {
    return []
  }
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const role = getCurrentRole()
  const [productsTotal, lowStockCount, activeRules, activity] = await Promise.all([
    getProductsTotal(),
    getLowStockCount(),
    getActiveRulesCount(),
    getRecentActivity(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        subtitle="Snapshot and quick actions"
        actions={(
          <div className="flex items-center gap-2">
            <Link href="/search" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Search</Link>
            <Link href="/analytics" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Analytics</Link>
          </div>
        )}
      />

      <form action="/search" method="get" className="relative">
        <label htmlFor="q" className="sr-only">Search</label>
        <div className="flex gap-2">
          <Input id="q" name="q" placeholder="Search products, clients, orders…" />
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Go</button>
        </div>
      </form>

      <section aria-label="Key metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Products" value={productsTotal} subtext="Total tracked" href="/inventory/products" />
        <KPICard title="Low stock" value={lowStockCount} subtext="Below threshold" href="/inventory/low-stock" />
        <KPICard title="Active rules" value={activeRules} subtext="Alerts & tasks" href="/alerts" />
        <KPICard title="Reports" value={"View"} subtext="Dashboards & exports" href="/analytics" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Quick actions</div>
            <div className="flex flex-wrap gap-2">
              <Link href="/quotes/new" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">New Quote</Link>
              <Link href="/inventory/purchase-orders/new" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">New PO</Link>
              <Link href="/inventory/products/new" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Add Product</Link>
              <Link href="/attachments" className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Attachments</Link>
            </div>
          </div>

          <RecentActivity items={activity} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Navigate</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><Link className="hover:underline" href="/inventory">Inventory</Link></li>
              <li><Link className="hover:underline" href="/sales">Sales</Link></li>
              <li><Link className="hover:underline" href="/finance">Finance</Link></li>
              <li><Link className="hover:underline" href="/clients">Clients</Link></li>
              <li><Link className="hover:underline" href="/analytics">Analytics</Link></li>
            </ul>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Tips</div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><kbd className="px-1 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 border rounded">K</kbd> opens search</li>
              <li><kbd className="px-1 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 border rounded">N</kbd> context action</li>
              <li>Use breadcrumbs to navigate</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  )
}
