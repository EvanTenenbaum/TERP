import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

const tiles: { title: string; href: string; description: string }[] = [
  { title: 'Products', href: '/inventory/products', description: 'Catalog and stock by intake date' },
  { title: 'Categories', href: '/inventory/categories', description: 'Organize and manage product taxonomy' },
  { title: 'Purchase Orders', href: '/inventory/purchase-orders', description: 'Create, receive, and track POs' },
  { title: 'Transfers', href: '/inventory/transfers', description: 'Move inventory between lots' },
  { title: 'Adjustments', href: '/inventory/adjustments', description: 'Add/remove inventory with reasons' },
  { title: 'Returns', href: '/inventory/returns', description: 'Process returns and credit' },
  { title: 'Discrepancies', href: '/inventory/discrepancies', description: 'Investigate and resolve variances' },
  { title: 'Low Stock', href: '/inventory/low-stock', description: 'Replenishment candidates and alerts' },
]

export default function InventoryDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Overview and quick actions" />
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">Total Products</h3>
            <p className="text-2xl font-bold text-blue-900">--</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">Products In Stock</h3>
            <p className="text-2xl font-bold text-green-900">--</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800">Latest Intake</h3>
            <p className="text-2xl font-bold text-yellow-900">--</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">Low Stock Items</h3>
            <p className="text-2xl font-bold text-red-900">--</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Explore</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tiles.map(t => (
              <Link key={t.href} href={t.href} className="block border rounded p-3 hover:shadow">
                <div className="font-medium text-gray-900">{t.title}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              href="/inventory/products/new"
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add New Product
            </Link>
            <Link
              href="/api/inventory/export"
              className="block w-full bg-indigo-600 text-white text-center py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Export Inventory CSV
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <EmptyState title="No recent activity" description="Intakes, transfers, and adjustments will show up here." />
        </div>
      </div>
    </div>
  );
}
