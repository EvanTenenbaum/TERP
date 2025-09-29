'use client'
import type { ClientProfile } from '@/lib/client/profile'
import { useMemo, useState } from 'react'

type Filter = 'activity'

export default function UnifiedLedger({
  data,
  initialFilter = 'activity',
  compact = false,
}: {
  data: ClientProfile
  initialFilter?: Filter
  compact?: boolean
}) {
  const [flt, setFlt] = useState<Filter>(initialFilter)

  const rows = useMemo(() => data.activity, [data.activity])

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex flex-wrap gap-3">
          {(['activity'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFlt(f)}
              className={`text-sm ${flt === f ? 'font-semibold underline' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y">
        {rows.map((r, i) => (
          <div key={i} className={`flex items-center justify-between p-3 ${compact ? 'text-sm' : ''}`}>
            <div className="w-48">{new Date(r.ts).toLocaleString()}</div>
            <div className="w-28 font-mono text-xs">{r.type}</div>
            <div className="flex-1 px-4">{r.label}</div>
            <div className="w-40 tabular-nums text-right">
              {typeof r.amountCents === 'number' ? (r.amountCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
