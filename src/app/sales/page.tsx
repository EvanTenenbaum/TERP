import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

const cards: { title: string; href: string; description: string }[] = [
  { title: 'Sales Sheets', href: '/quotes', description: 'Create and manage sales sheets; convert to orders' },
  { title: 'Orders', href: '/orders', description: 'Process orders and manage fulfillment' },
  { title: 'B2B Orders', href: '/b2b/orders', description: 'External portal orders management' },
  { title: 'Price Books', href: '/price-books', description: 'Configure pricing and overrides' },
  { title: 'Samples', href: '/samples', description: 'Track incoming/outgoing samples and returns' },
  { title: 'Samples Report', href: '/samples/report', description: 'Analyze sample activity and outcomes' },
]

export default function SalesLanding() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sales" subtitle="Quotes, Orders, Pricing, and Samples" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href} className="block border rounded-lg bg-white p-4 hover:shadow">
            <div className="font-medium text-gray-900">{c.title}</div>
            <div className="text-sm text-gray-600 mt-1">{c.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
