import { generateDunningPreview, logDunningToSentry } from '@/actions/finance'
import { revalidatePath } from 'next/cache'

export default async function DunningPage({ searchParams }: { searchParams?: { days?: string } }) {
  const minDays = Number(searchParams?.days || '1')
  const { success, customers } = await generateDunningPreview(isNaN(minDays) ? 1 : minDays)

  async function logAction(formData: FormData) {
    'use server'
    const days = Number(formData.get('days') || '1')
    await logDunningToSentry(isNaN(days) ? 1 : days)
    revalidatePath('/finance/ar/dunning')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AR Dunning Notices</h1>
        <form action={logAction} className="flex items-center gap-2">
          <input type="number" name="days" defaultValue={isNaN(minDays) ? 1 : minDays} min={1} className="w-24 rounded border-gray-300 px-3 py-2" />
          <button type="submit" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">Log Notices</button>
        </form>
      </div>
      <p className="text-sm text-gray-600">Preview of customers with invoices overdue by at least the specified number of days. Use “Log Notices” to record notices to Sentry.</p>
      {!success || customers.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-gray-600">No customers meet the criteria.</div>
      ) : (
        <div className="bg-white rounded shadow divide-y">
          {customers.map((c)=> (
            <div key={c.customerId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{c.customerName}</div>
                <div className="text-sm text-gray-500">Total Due: ${ (c.totalDueCents/100).toFixed(2) }</div>
              </div>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                {c.items.map((i)=> (
                  <div key={i.arId} className="flex items-center justify-between">
                    <div>Invoice {i.invoiceNumber}</div>
                    <div className="text-gray-500">Due {new Date(i.dueDate).toLocaleDateString()}</div>
                    <div className="tabular-nums">${ (i.balanceCents/100).toFixed(2) }</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
