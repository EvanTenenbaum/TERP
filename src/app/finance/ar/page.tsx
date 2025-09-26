import { getAccountsReceivable, getARAging } from '@/actions/finance'

export default async function ARPage() {
  const [{ success, rows }, aging] = await Promise.all([getAccountsReceivable(), getARAging()])
  const sum = aging?.success ? aging.summary : { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Accounts Receivable</h1>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(sum).map(([k,v])=> (
          <div key={k} className="bg-white shadow rounded p-3">
            <div className="text-xs text-gray-500">{k} days</div>
            <div className="text-xl font-semibold">${(v/100).toFixed(2)}</div>
          </div>
        ))}
      </section>

      {!success || rows.length===0 ? (
        <div className="text-gray-500">No AR invoices.</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r)=> (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.invoiceNumber}</td>
                  <td className="px-3 py-2">{r.customer?.companyName}</td>
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
