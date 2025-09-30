import { getOrders } from '@/actions/orders'
import Link from 'next/link'

export default async function OrdersPage() {
  const { success, orders } = await getOrders()
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">All customer orders</p>
        </div>
      </div>

      {!success || orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No orders yet.</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {orders.map((order:any) => (
              <li key={order.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">Order {order.id.slice(0,8)}</p>
                    <p className="text-sm text-gray-500">{order.customer?.companyName || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${(order.totalAmount/100).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{order.orderItems.length} item{order.orderItems.length!==1?'s':''}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>Placed {new Date(order.orderDate).toLocaleDateString()}</span>
                  <Link href={`/orders/${order.id}`} className="text-primary-600 underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
