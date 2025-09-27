'use client'
import React, { useMemo } from 'react'

export type FilterOption = { key: string; label: string; value: string | number | boolean | null }

type Props = {
  filters: FilterOption[]
  onClear: (key: string) => void
  onClearAll?: () => void
}

export function FilterBar({ filters, onClear, onClearAll }: Props) {
  const active = useMemo(() => filters.filter(f => f.value !== null && f.value !== ''), [filters])
  if (active.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {active.map(f => (
        <span key={f.key} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs">
          <span className="font-medium text-gray-700">{f.label}:</span>
          <span className="text-gray-700">{String(f.value)}</span>
          <button aria-label={'Clear ' + f.label} onClick={() => onClear(f.key)} className="rounded p-1 hover:bg-gray-200">×</button>
        </span>
      ))}
      {onClearAll ? <button onClick={onClearAll} className="text-xs text-blue-700 hover:underline">Clear all</button> : null}
    </div>
  )
}
