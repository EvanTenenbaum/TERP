import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

const tiles: { title: string; href: string; description: string }[] = [
  { title: 'Accounts Receivable', href: '/finance/ar', description: 'Customers, invoices, aging, and dunning' },
  { title: 'Dunning', href: '/finance/ar/dunning', description: 'Automate collections workflows' },
  { title: 'Accounts Payable', href: '/finance/ap', description: 'Vendor invoices and aging' },
  { title: 'Payments', href: '/finance/payments', description: 'Record and reconcile payments' },
  { title: 'Credits', href: '/finance/credits', description: 'Create and apply credits' },
  { title: 'Vendor Settlements', href: '/finance/vendor-settlements', description: 'Settle vendor statements' },
  { title: 'Vendor Rebates', href: '/finance/vendor-rebates', description: 'Track earned rebates' },
]

export default function FinanceLanding() {
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="AR, AP, payments, credits, and vendor programs" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(t => (
          <Link key={t.href} href={t.href} className="block border rounded-lg bg-white p-4 hover:shadow">
            <div className="font-medium text-gray-900">{t.title}</div>
            <div className="text-sm text-gray-600 mt-1">{t.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
