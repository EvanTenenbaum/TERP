import prisma from '@/lib/prisma'

export default async function ProfitabilityPage() {
  const entries = await prisma.profitabilityLedger.findMany({ orderBy: { runDate: 'desc' }, take: 100 })
  const total = entries.reduce((acc, e) => ({
    revenue: acc.revenue + e.revenue,
    cogs: acc.cogs + e.cogs,
    opex: acc.opex + e.opex,
    badDebt: acc.badDebt + e.badDebt,
    margin: acc.margin + e.margin,
  }), { revenue: 0, cogs: 0, opex: 0, badDebt: 0, margin: 0 })

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profitability</h1>
        <p className="text-gray-600">Nightly ledger of profitability metrics.</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Totals (last {entries.length} rows)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><div className="text-gray-500">Revenue</div><div className="font-semibold">${(total.revenue/100).toFixed(2)}</div></div>
          <div><div className="text-gray-500">COGS</div><div className="font-semibold">${(total.cogs/100).toFixed(2)}</div></div>
          <div><div className="text-gray-500">OpEx</div><div className="font-semibold">${(total.opex/100).toFixed(2)}</div></div>
          <div><div className="text-gray-500">Bad Debt</div><div className="font-semibold">${(total.badDebt/100).toFixed(2)}</div></div>
          <div><div className="text-gray-500">Margin</div><div className="font-semibold">${(total.margin/100).toFixed(2)}</div></div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Ledger</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COGS</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OpEx</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bad Debt</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((e)=> (
                <tr key={e.id}>
                  <td className="px-4 py-2">{new Date(e.runDate).toLocaleString()}</td>
                  <td className="px-4 py-2">{e.batchId || '-'}</td>
                  <td className="px-4 py-2">{e.vendorId || '-'}</td>
                  <td className="px-4 py-2">${(e.revenue/100).toFixed(2)}</td>
                  <td className="px-4 py-2">${(e.cogs/100).toFixed(2)}</td>
                  <td className="px-4 py-2">${(e.opex/100).toFixed(2)}</td>
                  <td className="px-4 py-2">${(e.badDebt/100).toFixed(2)}</td>
                  <td className="px-4 py-2">${(e.margin/100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
