'use client'
import type { ClientProfile as T } from '@/lib/client/profile'
import ClientHeader from '@/components/client/ClientHeader'
import SummaryCards from '@/components/client/SummaryCards'
import SmartAlerts from '@/components/client/SmartAlerts'
import UnifiedLedger from '@/components/client/UnifiedLedger'
import CreditPanel from '@/components/client/CreditPanel'
import ConsignmentPanel from '@/components/client/ConsignmentPanel'
import OrdersQuotesPanel from '@/components/client/OrdersQuotesPanel'
import ApArPanel from '@/components/client/ApArPanel'
import NotesRemindersPanel from '@/components/client/NotesRemindersPanel'
import AttachmentsPanel from '@/components/client/AttachmentsPanel'
import { useState } from 'react'

export default function ClientProfile({ data }: { data: T }) {
  const [tab, setTab] = useState<'overview'|'ledger'|'credit'|'consign'|'orders'|'apay'|'notes'|'docs'>('overview')
  const hasCustomer = data.party.isCustomer
  const hasVendor = data.party.isVendor

  return (
    <div className="space-y-6">
      <ClientHeader data={data} onTabChange={setTab} />
      <SummaryCards data={data} />
      <SmartAlerts data={data} />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-4">
          <Tab id="overview" tab={tab} setTab={setTab} label="Overview" />
          <Tab id="ledger" tab={tab} setTab={setTab} label="Transactions" />
          {hasCustomer && <Tab id="credit" tab={tab} setTab={setTab} label="Credit & Terms" />}
          {hasVendor && <Tab id="consign" tab={tab} setTab={setTab} label="Consignments" />}
          {hasCustomer && <Tab id="orders" tab={tab} setTab={setTab} label="Orders & Quotes" />}
          {(hasCustomer || hasVendor) && <Tab id="apay" tab={tab} setTab={setTab} label="AP & AR" />}
          <Tab id="notes" tab={tab} setTab={setTab} label="Notes & Reminders" />
          <Tab id="docs" tab={tab} setTab={setTab} label="Documents" />
        </nav>
      </div>

      <div>
        {tab === 'overview' && <UnifiedLedger data={data} initialFilter="activity" compact />}
        {tab === 'ledger' && <UnifiedLedger data={data} />}
        {tab === 'credit' && hasCustomer && <CreditPanel data={data} />}
        {tab === 'consign' && hasVendor && <ConsignmentPanel data={data} />}
        {tab === 'orders' && hasCustomer && <OrdersQuotesPanel data={data} />}
        {tab === 'apay' && <ApArPanel data={data} />}
        {tab === 'notes' && <NotesRemindersPanel data={data} />}
        {tab === 'docs' && <AttachmentsPanel partyId={data.party.id} customerId={data.customer?.id} vendorId={data.vendor?.id} />}
      </div>
    </div>
  )
}

function Tab({ id, tab, setTab, label }: { id: any; tab: any; setTab: (t:any)=>void; label: string }) {
  const active = tab === id
  return (
    <button
      onClick={() => setTab(id)}
      className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
        active ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
