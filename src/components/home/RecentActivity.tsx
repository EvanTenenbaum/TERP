import React from 'react'

export type ActivityItem = { when: string | Date; type: string; summary: string }

export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (!items?.length) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm text-gray-600">No recent activity.</div>
      </div>
    )
  }
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50 text-sm font-medium text-gray-700">Recent activity</div>
      <ul role="list" className="divide-y">
        {items.map((it, idx) => (
          <li key={idx} className="px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="text-gray-900">{it.summary}</div>
              <time className="whitespace-nowrap text-gray-500" dateTime={new Date(it.when).toISOString()}>
                {new Date(it.when).toLocaleString()}
              </time>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{it.type}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
