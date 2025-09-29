import { getAccountsPayable, applyApPayment } from '@/actions/finance'
import { revalidatePath } from 'next/cache'

import EmptyState from '@/components/ui/EmptyState'
import { ClientLink } from '@/components/client/ClientLink'

export default async function APPage({ searchParams }: { searchParams?: { q?: string; sort?: string; dir?: 'asc'|'desc' } }) {
  const { success, rows } = await getAccountsPayable()
  const q = (searchParams?.q || '').toLowerCase()
  const sort = searchParams?.sort || 'due'
  const dir = (searchParams?.dir === 'asc' ? 'asc' : 'desc') as 'asc'|'desc'
  const filtered = (rows || []).filter((r: any)=> !q || r.invoiceNumber.toLowerCase().includes(q) || (r.vendor?.companyName || '').toLowerCase().includes(q)).sort((a: any, b: any)=>{
    const mul = dir==='asc' ? 1 : -1
    if (sort==='invoice') return a.invoiceNumber.localeCompare(b.invoiceNumber)*mul
    if (sort==='vendor') return (a.vendor?.companyName||'').localeCompare(b.vendor?.companyName||'')*mul
    if (sort==='amount') return (a.amount-b.amount)*mul
    if (sort==='balance') return (a.balanceRemaining-b.balanceRemaining)*mul
    if (sort==='due') return (new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime())*mul
    return 0
  })

  const hdr = (key: string, label: string)=>{
    const nextDir = sort===key && dir==='desc' ? 'asc' : 'desc'
    const params = new URLSearchParams({ q: searchParams?.q||'', sort: key, dir: nextDir })
    return <a href={`?${params.toString()}`} className="hover:underline">{label}</a>
  }

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
      <div className="mb-3 flex items-center gap-3">
        <form className="flex items-center gap-2">
          <input name="q" defaultValue={searchParams?.q || ''} placeholder="Filter by invoice or vendor" className="w-full md:w-80 rounded border-gray-300 px-3 py-2" />
          <button className="hidden" type="submit" />
        </form>
        <a href="/api/finance/ap/export" className="inline-flex items-center rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-black">Export CSV</a>
        <a href="/api/finance/ap/aging" className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">Aging (JSON)</a>
        <a href="/api/finance/ap/aging.csv" className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">Aging CSV</a>
      </div>

      {!success || filtered.length===0 ? (
        <EmptyState title="No AP bills" description={searchParams?.q ? 'Try clearing the filter.' : 'Accept incoming B2B orders to generate payables.'} />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{hdr('invoice','Invoice #')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{hdr('vendor','Vendor')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{hdr('amount','Amount')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{hdr('balance','Balance')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{hdr('due','Due')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Apply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r)=> (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.invoiceNumber}</td>
                  <td className="px-3 py-2">{r.vendor ? (<ClientLink partyId={r.vendor.partyId || r.vendor.party?.id} fallbackHref="/clients">{r.vendor.party?.name || r.vendor.companyName}</ClientLink>) : null}</td>
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
