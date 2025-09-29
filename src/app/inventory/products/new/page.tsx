'use client';

"use client";
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { FormEngine } from '@/lib/forms/engine'
import { z } from 'zod'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  defaultPrice: z.string().optional(),
  unit: z.string().default('gram'),
  isActive: z.boolean().default(true),
})

export default function NewProductPage() {
  const router = useRouter();
  const { push } = useToast();

  async function onSubmit(values: z.infer<typeof productSchema>) {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: values.sku,
        name: values.name,
        category: values.category,
        unit: values.unit,
        defaultPrice: Number(values.defaultPrice || 0),
        isActive: values.isActive,
      })
    })
    const data = await res.json().catch(()=>({ success:false }))
    if (!res.ok || !data.success) throw new Error(data.error || 'create_failed')
    push({ message: 'Product created' });
    router.push('/inventory/products');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Add New Product</h2>
        </div>
        <div className="p-6 space-y-6">
          <FormEngine
            schema={productSchema}
            initial={{ unit: 'gram', isActive: true }}
            onSubmit={onSubmit}
            submitLabel="Create Product"
            fields={[
              { name: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'e.g., FLOWER-001' },
              { name: 'category', label: 'Category', type: 'select', required: true, options: [
                { value: 'flower', label: 'Flower' },
                { value: 'concentrate', label: 'Concentrate' },
                { value: 'edible', label: 'Edible' },
                { value: 'topical', label: 'Topical' },
                { value: 'accessory', label: 'Accessory' },
              ] },
              { name: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'e.g., Premium OG Kush' },
              { name: 'description', label: 'Description', type: 'textarea' },
              { name: 'defaultPrice', label: 'Default Price (USD)', type: 'number', hint: 'Optional' },
              { name: 'unit', label: 'Unit of Measure', type: 'select', options: [
                { value: 'gram', label: 'Gram' },
                { value: 'ounce', label: 'Ounce' },
                { value: 'pound', label: 'Pound' },
                { value: 'each', label: 'Each' },
                { value: 'package', label: 'Package' },
              ] },
              { name: 'isActive', label: 'Active Product', type: 'checkbox', hint: 'Active Product' },
            ]}
          />
          <div className="flex justify-end border-t pt-6">
            <button type="button" onClick={()=>router.back()} className="px-4 py-2 border border-border rounded-md text-neutral-700 hover:bg-neutral-50">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
