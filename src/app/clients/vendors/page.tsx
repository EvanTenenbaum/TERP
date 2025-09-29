import PageHeader from '@/components/ui/PageHeader'
import { getVendors } from '@/actions/inventory'

export default async function VendorsPage() {
  const res = await getVendors()
  const vendors = res.success ? (res.vendors as any[]) : []
  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" />
      {vendors.length === 0 ? (
        <div className="bg-white rounded border p-6 text-sm text-gray-600">No vendors yet.</div>
      ) : (
        <div className="bg-white rounded border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendors.map(v => (
                <tr key={v.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{v.vendorCode}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{v.companyName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
