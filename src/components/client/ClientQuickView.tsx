'use client'
import type { ClientProfile } from '@/lib/client/profile'
import SummaryCards from './SummaryCards'
import UnifiedLedger from './UnifiedLedger'
import { useRouter } from 'next/navigation'

export default function ClientQuickView({ data }: { data: ClientProfile }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="h-full w-full max-w-xl overflow-auto bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{data.party.name}</h2>
          <button onClick={() => router.back()} className="text-sm underline">Close</button>
        </div>
        <div className="mt-4 space-y-4">
          <SummaryCards data={data} />
          <UnifiedLedger data={data} initialFilter="activity" compact />
        </div>
      </div>
    </div>
  )
}
