import { getKpis } from '@/actions/analytics'

import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const { success, data } = await getKpis()
  const d = success ? data : { arOutstanding: 0, apOutstanding: 0, salesLast30: 0, ordersLast30: 0, inventoryValue: 0 }
  const card = (label: string, value: number | string) => (
    <div className="bg-white shadow rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{typeof value === 'number' ? `$${(value/100).toFixed(2)}` : value}</div>
    </div>
  )
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Analytics" subtitle="KPIs and operational dashboards" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {card('AR Outstanding', d.arOutstanding)}
        {card('AP Outstanding', d.apOutstanding)}
        {card('Inventory Value', d.inventoryValue)}
        {card('Sales (Last 30d)', d.salesLast30)}
        <div className="bg-white shadow rounded p-4">
          <div className="text-sm text-gray-500">Orders (Last 30d)</div>
          <div className="text-2xl font-semibold">{d.ordersLast30}</div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/analytics/profitability" className="block border rounded-lg bg-white p-4 hover:shadow">
          <div className="font-medium text-gray-900">Profitability</div>
          <div className="text-sm text-gray-600 mt-1">Margins by customer, product, and time</div>
        </Link>
        <Link href="/alerts" className="block border rounded-lg bg-white p-4 hover:shadow">
          <div className="font-medium text-gray-900">Alerts</div>
          <div className="text-sm text-gray-600 mt-1">Inventory and finance alerts center</div>
        </Link>
        <Link href="/admin/audit-log" className="block border rounded-lg bg-white p-4 hover:shadow">
          <div className="font-medium text-gray-900">Audit Log</div>
          <div className="text-sm text-gray-600 mt-1">System changes and activity</div>
        </Link>
        <Link href="/admin/qa" className="block border rounded-lg bg-white p-4 hover:shadow">
          <div className="font-medium text-gray-900">QA Tools</div>
          <div className="text-sm text-gray-600 mt-1">Diagnostics and test utilities</div>
        </Link>
      </div>
    </div>
    </div>
  )
}
