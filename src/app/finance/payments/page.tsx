import { getPayments } from '@/actions/finance'

export default async function PaymentsPage() {
  const { success, rows } = await getPayments()
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Payments</h1>
      {!success || rows.length===0 ? (
        <div className="text-gray-500">No payments.</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((p)=> (
                <tr key={p.id}>
                  <td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{p.customer?.companyName}</td>
                  <td className="px-3 py-2">${(p.amount/100).toFixed(2)}</td>
                  <td className="px-3 py-2">{p.paymentApplications.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
