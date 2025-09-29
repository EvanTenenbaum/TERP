import type { ClientProfile } from '@/lib/client/profile'

export default function SmartAlerts({ data }: { data: ClientProfile }) {
  const alerts: string[] = []
  const avgLate = data.customer?.arStats.avgDaysLate ?? 0
  if (avgLate > 0) alerts.push(`Receivables averaging ${avgLate} days late.`)

  const limit = data.customer?.creditLimitCents ?? 0
  const ar = data.customer?.arOpenCents ?? 0
  if (limit > 0 && ar > limit) alerts.push('Credit limit exceeded.')

  const consignOver60 = (data.vendor?.consignOnHand ?? []).filter((c) => c.days >= 60).length
  if (consignOver60 > 0) alerts.push(`${consignOver60} consigned items aged 60+ days.`)

  if (!alerts.length) return null
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          {a}
        </div>
      ))}
    </div>
  )
}
