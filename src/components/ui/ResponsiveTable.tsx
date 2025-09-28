'use client'
import React, { useState } from 'react'

export type Column<T> = {
  key: keyof T
  header: string
  priority?: number
  render?: (row: T) => React.ReactNode
}

type Props<T> = { columns: Column<T>[]; rows: T[]; loading?: boolean; skeletonRows?: number }

export function ResponsiveTable<T extends Record<string, any>>({ columns, rows, loading = false, skeletonRows = 5 }: Props<T>) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const sorted = [...columns].sort((a,b) => (a.priority ?? 99) - (b.priority ?? 99))
  const primaryCols = sorted.slice(0, 3)
  const secondaryCols = sorted.slice(3)

  const skeletonCells = (count: number) => (
    <tr className="animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <td key={idx} className="px-3 py-2"><div className="h-4 bg-gray-200 rounded" /></td>
      ))}
    </tr>
  )

  return (
    <div className="w-full">
      <div className="hidden md:block overflow-auto">
        <table className="min-w-full border divide-y">
          <thead className="bg-gray-50">
            <tr>{columns.map(c => <th key={String(c.key)} className="px-3 py-2 text-left text-sm font-medium text-gray-700">{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => <React.Fragment key={i}>{skeletonCells(columns.length)}</React.Fragment>)
              : rows.map((row,i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map(c => (
                      <td key={String(c.key)} className="px-3 py-2 text-sm text-gray-800">{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <ul className="divide-y">
          {(loading ? Array.from({ length: skeletonRows }).map((_, i) => (
            <li key={i} className="py-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </li>
          )) : rows.map((row, i) => (
            <li key={i} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{primaryCols[0] ? (primaryCols[0].render ? primaryCols[0].render(row) : String(row[primaryCols[0].key])) : null}</div>
                  <div className="text-sm text-gray-600">
                    {primaryCols.slice(1).map(c => <span key={String(c.key)} className="mr-3">{c.header}: {c.render ? c.render(row) : String(row[c.key])}</span>)}
                  </div>
                </div>
                <button aria-expanded={expandedRow===i} onClick={() => setExpandedRow(expandedRow===i?null:i)} className="rounded px-2 py-1 text-sm border">Details</button>
              </div>
              {expandedRow===i && secondaryCols.length>0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {secondaryCols.map(c => (
                    <div key={String(c.key)} className="text-sm text-gray-700">
                      <span className="font-medium">{c.header}:</span> {c.render ? c.render(row) : String(row[c.key])}
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          )))}
        </ul>
      </div>
    </div>
  )
}
