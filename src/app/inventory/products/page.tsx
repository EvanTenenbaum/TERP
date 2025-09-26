import Link from 'next/link';
import ProductInventoryTable from '@/components/inventory/ProductInventoryTable';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <Link
          href="/inventory/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Product
        </Link>
      </div>

      <ProductInventoryTable />
    </div>
  );
}
