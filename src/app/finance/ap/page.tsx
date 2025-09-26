import { getAccountsPayable } from '@/actions/finance'

export default async function APPage() {
  const { success, rows } = await getAccountsPayable()
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Accounts Payable</h1>
      {!success || rows.length===0 ? (
        <div className="text-gray-500">No AP bills.</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r)=> (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.invoiceNumber}</td>
                  <td className="px-3 py-2">{r.vendor?.companyName}</td>
                  <td className="px-3 py-2">${(r.amount/100).toFixed(2)}</td>
                  <td className="px-3 py-2">${(r.balanceRemaining/100).toFixed(2)}</td>
                  <td className="px-3 py-2">{new Date(r.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
