import { getKpis } from '@/actions/analytics'

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
      <h1 className="text-3xl font-bold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {card('AR Outstanding', d.arOutstanding)}
        {card('AP Outstanding', d.apOutstanding)}
        {card('Inventory Value', d.inventoryValue)}
        {card('Sales (Last 30d)', d.salesLast30)}
        <div className="bg-white shadow rounded p-4">
          <div className="text-sm text-gray-500">Orders (Last 30d)</div>
          <div className="text-2xl font-semibold">{d.ordersLast30}</div>
        </div>
      </div>
    </div>
  )
}
