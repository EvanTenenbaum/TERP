import { listSales } from '@/actions/b2bSale'
import Link from 'next/link'

export default async function B2BOrdersPage() {
  const { success, sales } = await listSales()
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">B2B Orders</h1>
          <p className="text-gray-600">Incoming/Outgoing wholesale orders</p>
        </div>
        <Link href="/b2b/orders/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Order</Link>
      </div>

      {!success || sales.length===0 ? (
        <div className="text-center py-12 text-gray-500">No B2B orders.</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sales.map((s:any)=> (
              <li key={s.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/b2b/orders/${s.id}`} className="text-sm font-medium text-blue-600 hover:underline">{s.type.toUpperCase()} · {s.status}</Link>
                    <div className="text-sm text-gray-500">Items: {s.itemList.length}</div>
                  </div>
                  <div className="text-right text-sm text-gray-500">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
