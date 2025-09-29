'use client'
import type { ClientProfile } from '@/lib/client/profile'

export default function ClientHeader({
  data,
  onTabChange,
}: {
  data: ClientProfile
  onTabChange?: (tab: string) => void
}) {
  const { party } = data
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{party.name}</h1>
        <div className="mt-2 flex gap-2">
          {party.isCustomer && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">Customer</span>}
          {party.isVendor && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs">Vendor</span>}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{party.isActive ? 'Active' : 'On Hold'}</span>
        </div>
      </div>
      <div className="flex gap-2">
        {party.isCustomer && (
          <button className="rounded border px-3 py-1 text-sm" onClick={() => onTabChange?.('orders')}>
            + New Order
          </button>
        )}
        {party.isVendor && (
          <button className="rounded border px-3 py-1 text-sm" onClick={() => onTabChange?.('consign')}>
            + New Purchase
          </button>
        )}
        <button className="rounded border px-3 py-1 text-sm" onClick={() => onTabChange?.('notes')}>
          + Note / Reminder
        </button>
        <button className="rounded border px-3 py-1 text-sm" onClick={() => onTabChange?.('docs')}>
          Attachments
        </button>
      </div>
    </div>
  )
}
