import type { ClientProfile } from '@/lib/client/profile'
import { formatCurrency } from '@/lib/format'

export default function ApArPanel({ data }: { data: ClientProfile }) {
  const ar = data.customer?.arOpenCents ?? 0
  const ap = data.vendor?.apOpenCents ?? 0
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded border p-4">
        <div className="mb-2 text-sm font-semibold">Accounts Receivable</div>
        <div className="text-2xl">{formatCurrency(ar / 100)}</div>
        <div className="text-xs text-gray-500">{data.customer?.arStats.openCount ?? 0} invoices open • Avg late {data.customer?.arStats.avgDaysLate ?? 0}d</div>
      </div>
      <div className="rounded border p-4">
        <div className="mb-2 text-sm font-semibold">Accounts Payable</div>
        <div className="text-2xl">{formatCurrency(ap / 100)}</div>
        <div className="text-xs text-gray-500">Next due {data.vendor?.apNextDue ? new Date(data.vendor.apNextDue).toLocaleDateString() : '—'}</div>
      </div>
    </div>
  )
}
