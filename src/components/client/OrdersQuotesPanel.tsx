import type { ClientProfile } from '@/lib/client/profile'
import { formatCurrency } from '@/lib/format'

export default function OrdersQuotesPanel({ data }: { data: ClientProfile }) {
  const orders = data.customer?.ordersRecent ?? []
  if (!data.customer) return null

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Recent Orders</div>
      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.id}</td>
                <td className="px-3 py-2">{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{formatCurrency(o.totalCents / 100)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
