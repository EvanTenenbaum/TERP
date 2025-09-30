import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import KPICard from '@/components/home/KPICard'
import RecentActivity, { ActivityItem } from '@/components/home/RecentActivity'
import { getCurrentRole } from '@/lib/auth'

async function getProductsTotal(): Promise<number> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/inventory/products/summary?pageSize=1`, { cache: 'no-store' })
    if (!r.ok) return 0
    const j = await r.json()
    return Number(j?.meta?.total || 0)
  } catch {
    return 0
  }
}

async function getLowStockCount(): Promise<number> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/alerts/replenishment/preview`, { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ thresholdDefault: 10 }) })
    if (!r.ok) return 0
    const j = await r.json()
    return Number((j?.data?.items || []).length)
  } catch {
    return 0
  }
}

async function getActiveRulesCount(): Promise<number> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/alerts/rules`, { cache: 'no-store' })
    if (!r.ok) return 0
    const j = await r.json()
    const rules = Array.isArray(j?.rules) ? j.rules : []
    return rules.filter((r: any) => r.active).length
  } catch {
    return 0
  }
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/audit?limit=10`, { cache: 'no-store' })
    if (!r.ok) return []
    const j = await r.json()
    return Array.isArray(j?.data) ? j.data : []
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
