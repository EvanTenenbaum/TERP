import Link from 'next/link';
import ProductInventoryTable from '@/components/inventory/ProductInventoryTable';
import PageHeader from '@/components/ui/PageHeader'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        actions={<Link href="/inventory/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Add Product</Link>}
      />
      <ProductInventoryTable />
    </div>
  );
}
