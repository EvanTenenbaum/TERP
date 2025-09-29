import type { ClientProfile } from '@/lib/client/profile'
import { formatCurrency } from '@/lib/format'

export default function SummaryCards({ data }: { data: ClientProfile }) {
  const cards: Array<{ label: string; value: string; hint?: string; indicator?: 'up'|'down'|'side'|'flat' }> = []

  if (data.party.isCustomer) {
    const ar = data.customer?.arOpenCents ?? 0
    cards.push({
      label: 'Receivables (They owe you)',
      value: formatCurrency(ar / 100),
      hint: `${data.customer?.arStats.openCount ?? 0} open • avg late ${data.customer?.arStats.avgDaysLate ?? 0}d`,
      indicator: ar > 0 ? 'up' : 'flat',
    })
  }
  if (data.party.isVendor) {
    const ap = data.vendor?.apOpenCents ?? 0
    cards.push({
      label: 'Payables (You owe them)',
      value: formatCurrency(ap / 100),
      hint: data.vendor?.apNextDue ? `Next due ${new Date(data.vendor.apNextDue).toLocaleDateString()}` : 'No upcoming',
      indicator: ap > 0 ? 'down' : 'flat',
    })
    const consignValue = data.quick.consignValueCents
    cards.push({
      label: 'Consignment On-Hand',
      value: formatCurrency(consignValue / 100),
      hint: `${data.vendor?.consignOnHand.length ?? 0} items`,
      indicator: consignValue > 0 ? 'side' : 'flat',
    })
  }
  cards.push({
    label: 'Last Activity',
    value: data.quick.lastActivityAt ? new Date(data.quick.lastActivityAt).toLocaleString() : '—',
    hint: 'Most recent interaction',
    indicator: 'flat',
  })

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">{c.label}</div>
          <div className="mt-1 flex items-center gap-1 text-xl font-semibold">
            {c.value}
            {c.indicator === 'up' && <span className="text-green-600">▲</span>}
            {c.indicator === 'down' && <span className="text-red-600">▼</span>}
            {c.indicator === 'side' && <span className="text-amber-600">◆</span>}
          </div>
          {c.hint && <div className="text-xs text-gray-400">{c.hint}</div>}
        </div>
      ))}
    </div>
  )
}
