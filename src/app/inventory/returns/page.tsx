import { getLotsForDropdown, customerReturn, vendorReturn, getVendors } from '@/actions/inventory'
import { getCustomersForDropdown } from '@/actions/customers'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/Button'

export default async function ReturnsPage() {
  const [{ success: lOk, lots }, { success: cOk, customers }, { success: vOk, vendors }] = await Promise.all([
    getLotsForDropdown(),
    getCustomersForDropdown(),
    getVendors(),
  ])

  async function submitReturn(formData: FormData) {
    'use server'
    const type = String(formData.get('type') || '')
    const lotId = String(formData.get('lotId') || '')
    const qty = Number(formData.get('quantity') || '0')
    const notes = String(formData.get('notes') || '') || undefined
    if (type === 'customer') {
      const customerId = String(formData.get('customerId') || '')
      await customerReturn(lotId, qty, customerId, notes)
    } else if (type === 'vendor') {
      const vendorId = String(formData.get('vendorId') || '')
      await vendorReturn(lotId, qty, vendorId, notes)
    }
    revalidatePath('/inventory/returns')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Returns</h1>
      <div className="bg-white rounded-md shadow-card border border-border p-4">
        <form action={submitReturn} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
            <select name="lotId" required aria-required="true" className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
              {(lOk && lots) ? lots.map((l: any)=> (
                <option key={l.id} value={l.id}>{l.label}</option>
              )) : null}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" min={1} step={1} name="quantity" required aria-required="true" defaultValue={1} className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
            <select name="type" required aria-required="true" className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
              <option value="customer">Customer Return (increase stock)</option>
              <option value="vendor">Vendor Return (decrease stock)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select name="customerId" className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
              {(cOk && customers) ? customers.map((c: any)=> (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              )) : null}
            </select>
            <p className="text-xs text-gray-500 mt-1">Used for Customer Return</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select name="vendorId" className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
              {(vOk && vendors) ? vendors.map((v: any)=> (
                <option key={v.id} value={v.id}>{v.vendorCode} — {v.companyName}</option>
              )) : null}
            </select>
            <p className="text-xs text-gray-500 mt-1">Used for Vendor Return</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" name="notes" className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Record Return</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
