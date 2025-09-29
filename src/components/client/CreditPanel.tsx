'use client'
import type { ClientProfile } from '@/lib/client/profile'
import { updateCustomerCredit } from '@/actions/clients'
import { useTransition, useState } from 'react'

export default function CreditPanel({ data }: { data: ClientProfile }) {
  const cust = data.customer
  const [credit, setCredit] = useState<string>(cust?.creditLimitCents ? (cust.creditLimitCents / 100).toString() : '')
  const [terms, setTerms] = useState<string>(cust?.paymentTerms ?? '')
  const [isPending, start] = useTransition()

  if (!cust) return null

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="text-sm text-gray-600">Credit Limit (USD)</label>
        <input
          type="number"
          className="mt-1 w-full rounded border px-3 py-2"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm text-gray-600">Payment Terms</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Net 30"
        />
      </div>
      <div className="flex gap-2">
        <button
          className="rounded border px-3 py-2 text-sm"
          disabled={isPending}
          onClick={() =>
            start(async () => {
              const creditLimitCents = credit ? Math.round(parseFloat(credit) * 100) : null
              await updateCustomerCredit({
                customerId: cust.id,
                creditLimitCents,
                paymentTerms: terms || null,
                revalidate: `/clients/${data.party.id}`,
              })
            })
          }
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="text-xs text-gray-500">
        Tip: Keep limits consistent with finance policy. Suggested changes should be reviewed if avg late days &gt; 30.
      </div>
    </div>
  )
}
