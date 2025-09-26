import { getAccountsPayable, applyApPayment } from '@/actions/finance'
import { revalidatePath } from 'next/cache'

import EmptyState from '@/components/ui/EmptyState'

export default async function APPage({ searchParams }: { searchParams?: { q?: string } }) {
  const { success, rows } = await getAccountsPayable()
  const q = (searchParams?.q || '').toLowerCase()
  const filtered = (rows || []).filter((r: any)=> !q || r.invoiceNumber.toLowerCase().includes(q) || (r.vendor?.companyName || '').toLowerCase().includes(q))

  async function applyAction(formData: FormData) {
    'use server'
    const apId = String(formData.get('apId') || '')
    const amt = parseFloat(String(formData.get('amount') || '0'))
    const cents = Number.isFinite(amt) ? Math.round(amt * 100) : 0
    if (!apId || cents <= 0) return
    await applyApPayment(apId, cents)
    revalidatePath('/finance/ap')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Accounts Payable</h1>
      <form className="mb-3 flex items-center gap-2"><input name="q" defaultValue={searchParams?.q || ''} placeholder="Filter by invoice or vendor" className="w-full md:w-80 rounded border-gray-300 px-3 py-2" /><button className="hidden" type="submit" /></form>

      {!success || filtered.length===0 ? (
        <EmptyState title="No AP bills" description={searchParams?.q ? 'Try clearing the filter.' : 'Accept incoming B2B orders to generate payables.'} />
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Apply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r)=> (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.invoiceNumber}</td>
                  <td className="px-3 py-2">{r.vendor?.companyName}</td>
                  <td className="px-3 py-2">${(r.amount/100).toFixed(2)}</td>
                  <td className="px-3 py-2">${(r.balanceRemaining/100).toFixed(2)}</td>
                  <td className="px-3 py-2">{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    {r.balanceRemaining > 0 ? (
                      <form action={applyAction} className="flex items-center gap-2">
                        <input type="hidden" name="apId" value={r.id} />
                        <input name="amount" type="number" step="0.01" min="0" max={(r.balanceRemaining/100).toFixed(2)} defaultValue={(r.balanceRemaining/100).toFixed(2)} className="w-28 rounded border-gray-300 px-2 py-1" />
                        <button type="submit" className="inline-flex items-center px-3 py-1.5 rounded bg-green-600 text-white text-sm">Apply</button>
                      </form>
                    ) : (
                      <span className="text-xs text-gray-400">Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
