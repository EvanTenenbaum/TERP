import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import { getCustomers } from '@/actions/customers'

export default async function CustomersPage() {
  const res = await getCustomers()
  const customers = res.success ? (res.customers as any[]) : []
  return (
    <div className="space-y-6">
      <PageHeader title="Customers" actions={<Link href="/clients/customers/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Customer</Link>} />
      {customers.length === 0 ? (
        <div className="bg-white rounded border p-6 text-sm text-gray-600">No customers yet.</div>
      ) : (
        <div className="bg-white rounded border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AR Open</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{c.displayName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{c._count?.orders ?? 0}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{c._count?.accountsReceivable ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
