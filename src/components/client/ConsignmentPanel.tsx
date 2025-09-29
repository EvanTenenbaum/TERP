import type { ClientProfile } from '@/lib/client/profile'
import { formatCurrency } from '@/lib/format'

export default function ConsignmentPanel({ data }: { data: ClientProfile }) {
  const consign = data.vendor?.consignOnHand ?? []
  if (!data.vendor) return null
  const total = consign.reduce((a, c) => a + c.estValueCents, 0)

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">On-hand consignment value: <strong>{formatCurrency(total / 100)}</strong></div>
      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Est. Value</th>
              <th className="px-3 py-2">Days</th>
            </tr>
          </thead>
          <tbody>
            {consign.map((c, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.sku ?? '—'}</td>
                <td className="px-3 py-2">{c.qty}</td>
                <td className="px-3 py-2">{formatCurrency(c.estValueCents / 100)}</td>
                <td className={`px-3 py-2 ${c.days >= 60 ? 'text-red-600' : ''}`}>{c.days}</td>
              </tr>
            ))}
            {consign.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  No consigned items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
