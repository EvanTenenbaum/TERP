import PageHeader from '@/components/ui/PageHeader'
import { getClients } from '@/actions/clients'
import Link from 'next/link'
import { ClientLink } from '@/components/client/ClientLink'

export default async function ClientsLanding() {
  const res = await getClients()
  const clients = res.success ? (res.clients as any[]) : []
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle="A single source of truth for customers and vendors" actions={<Link href="/clients/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Client</Link>} />
      <div className="bg-white rounded border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-sm text-gray-600">No clients yet.</td></tr>
            ) : clients.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-sm text-gray-900"><ClientLink partyId={c.id} fallbackHref="/clients">{c.name}</ClientLink></td>
                <td className="px-4 py-2 text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${c.isCustomer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>Customer</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${c.isVendor ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>Vendor</span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">{c.customer ? c.customer.companyName : '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{c.vendor ? `${c.vendor.vendorCode} — ${c.vendor.companyName}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
