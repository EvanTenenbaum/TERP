import { getPayments, getAccountsReceivable, createPayment, applyPayment } from '@/actions/finance'
import { getCustomersForDropdown } from '@/actions/customers'
import { revalidatePath } from 'next/cache'

import EmptyState from '@/components/ui/EmptyState'
import { ClientLink } from '@/components/client/ClientLink'

export default async function PaymentsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const [paymentsRes, arRes, customersRes] = await Promise.all([
    getPayments(),
    getAccountsReceivable(),
    getCustomersForDropdown(),
  ])

  const payments = paymentsRes.success ? paymentsRes.rows : []
  const arList = arRes.success ? arRes.rows : []
  const customers: any[] = (customersRes.success && (customersRes as any).customers) ? (customersRes as any).customers : []
  const q = (searchParams?.q || '').toLowerCase()
  const filteredPayments = payments.filter((p: any)=> !q || (p.customer?.companyName || '').toLowerCase().includes(q) || (p.referenceNumber || '').toLowerCase().includes(q))

  async function createPaymentAction(formData: FormData) {
    'use server'
    const customerId = String(formData.get('customerId') || '')
    const amountDollars = parseFloat(String(formData.get('amount') || '0'))
    const amountCents = Number.isFinite(amountDollars) ? Math.round(amountDollars * 100) : 0
    const method = String(formData.get('paymentMethod') || 'Other')
    const referenceNumber = String(formData.get('referenceNumber') || '')
    if (!customerId || amountCents <= 0) return
    await createPayment(customerId, amountCents, method, referenceNumber)
    revalidatePath('/finance/payments')
  }

  async function applyPaymentAction(formData: FormData) {
    'use server'
    const paymentId = String(formData.get('paymentId') || '')
    const arId = String(formData.get('arId') || '')
    const amt = parseFloat(String(formData.get('appliedAmount') || '0'))
    const appliedAmountCents = Number.isFinite(amt) ? Math.round(amt * 100) : 0
    if (!paymentId || !arId || appliedAmountCents <= 0) return
    await applyPayment(paymentId, arId, appliedAmountCents)
    revalidatePath('/finance/payments')
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Payments</h1>

      <form className="flex items-center gap-2"><input name="q" defaultValue={searchParams?.q || ''} placeholder="Filter by customer or ref #" className="w-full md:w-80 rounded border-gray-300 px-3 py-2" /><button className="hidden" type="submit" /></form>

      <section className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Record New Payment</h2>
        <form action={createPaymentAction} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select name="customerId" className="w-full rounded border-gray-300 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select customer</option>
              {customers.map((c: any)=> (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
            <input name="amount" type="number" step="0.01" min="0" placeholder="0.00" className="w-full rounded border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select name="paymentMethod" className="w-full rounded border-gray-300 focus:ring-indigo-500 focus:border-indigo-500">
              <option>ACH</option>
              <option>Wire</option>
              <option>Credit Card</option>
              <option>Check</option>
              <option>Cash</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input name="referenceNumber" type="text" placeholder="e.g. Check #, Wire Ref" className="w-full rounded border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2" />
          </div>
          <div className="md:col-span-1">
            <button type="submit" className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Save Payment</button>
          </div>
        </form>
      </section>

      <section className="bg-white shadow rounded-lg overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No payments" description={q ? 'Try clearing the filter.' : 'Record a payment to see it here.'} />
          </div>
        ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Applied</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPayments.map((p: any)=> {
              const applied = p.paymentApplications.reduce((s: number, a: any)=> s + a.appliedAmount, 0)
              const remaining = Math.max(0, p.amount - applied)
              const customerAR = arList.filter((r: any)=> r.customerId === p.customerId && r.balanceRemaining > 0)
              return (
                <>
                  <tr key={p.id}>
                    <td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{p.customer ? (<ClientLink partyId={p.customer.partyId || p.customer.party?.id} fallbackHref="/clients">{p.customer.party?.name || p.customer.companyName}</ClientLink>) : null}</td>
                    <td className="px-3 py-2">${(p.amount/100).toFixed(2)}</td>
                    <td className="px-3 py-2">${(applied/100).toFixed(2)}</td>
                    <td className="px-3 py-2">${(remaining/100).toFixed(2)}</td>
                  </tr>
                  {customerAR.length > 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 bg-gray-50">
                        <details>
                          <summary className="cursor-pointer text-sm text-gray-700">Apply to invoices for {p.customer?.party?.name || p.customer?.companyName}</summary>
                          <div className="mt-3 space-y-3">
                            <form action={async (formData: FormData)=> { 'use server'; const id=String(formData.get('paymentId')||''); if(!id) return; const { applyPaymentToOpenInvoicesFIFO } = await import('@/actions/finance'); await applyPaymentToOpenInvoicesFIFO(id); revalidatePath('/finance/payments') }}>
                              <input type="hidden" name="paymentId" value={p.id} />
                              <button type="submit" className="inline-flex items-center px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">Apply FIFO</button>
                            </form>
                            {customerAR.map((r: any)=> {
                              const maxApply = Math.min(remaining, r.balanceRemaining)
                              return (
                                <form key={r.id} action={applyPaymentAction} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-white p-3 rounded border">
                                  <input type="hidden" name="paymentId" value={p.id} />
                                  <input type="hidden" name="arId" value={r.id} />
                                  <div className="md:col-span-2 text-sm">
                                    <div className="font-medium">Invoice {r.invoiceNumber}</div>
                                    <div className="text-gray-500">Due {new Date(r.dueDate).toLocaleDateString()}</div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Balance</label>
                                    <div className="text-sm">${(r.balanceRemaining/100).toFixed(2)}</div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Apply (USD)</label>
                                    <input name="appliedAmount" type="number" step="0.01" min="0" max={(maxApply/100).toFixed(2)} defaultValue={(Math.min(maxApply, r.balanceRemaining)/100).toFixed(2)} className="w-full rounded border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 px-2 py-1" />
                                  </div>
                                  <div className="md:col-span-1">
                                    <button type="submit" disabled={remaining<=0} className="w-full inline-flex justify-center items-center px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Apply</button>
                                  </div>
                                </form>
                              )
                            })}
                          </div>
                        </details>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        )}
      </section>
    </div>
  )
}
