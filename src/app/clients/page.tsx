import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

export default function ClientsLanding() {
  const tiles = [
    { title: 'Customers', href: '/clients/customers', description: 'Manage customer profiles and activity' },
    { title: 'Vendors', href: '/clients/vendors', description: 'Manage vendor profiles and terms' },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle="Customers and Vendors management" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
