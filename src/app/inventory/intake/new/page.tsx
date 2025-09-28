import { createProductIntake } from '@/actions/intake'
import { revalidatePath } from 'next/cache'

export default function IntakePage() {
  async function submit(formData: FormData) {
    'use server'
    const notes = String(formData.get('notes')||'') || undefined
    let metadata: Record<string, any> | undefined = undefined
    const mdRaw = String(formData.get('metadata')||'')
    if (mdRaw) {
      try { metadata = JSON.parse(mdRaw) } catch { metadata = undefined }
    }

    const data = {
      retailName: String(formData.get('retailName')||''),
      standardStrainName: String(formData.get('standardStrainName')||'') || undefined,
      category: String(formData.get('category')||''),
      unit: String(formData.get('unit')||'each'),
      defaultPriceCents: Math.round(parseFloat(String(formData.get('defaultPrice')||'0'))*100),
      vendorCode: String(formData.get('vendorCode')||''),
      vendorCompany: String(formData.get('vendorCompany')||'') || undefined,
      terms: (String(formData.get('terms')||'COD').toUpperCase() as any),
      netDays: parseInt(String(formData.get('netDays')||'30'))||30,
      dateReceived: new Date(String(formData.get('dateReceived')||new Date().toISOString().slice(0,10))),
      lotNumber: String(formData.get('lotNumber')||''),
      quantity: Math.round(parseFloat(String(formData.get('quantity')||'0'))),
      unitCostCents: Math.round(parseFloat(String(formData.get('unitCost')||'0'))*100),
      notes,
      metadata,
    }
    await createProductIntake(data as any)
    revalidatePath('/inventory')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Add Product (Unified Intake)</h1>
      <form action={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded shadow p-4">
        <div className="md:col-span-3 font-semibold">Product</div>
        <input name="retailName" placeholder="Retail Name" className="border rounded px-3 py-2" required />
        <input name="standardStrainName" placeholder="Standard Strain (optional)" className="border rounded px-3 py-2" />
        <input name="category" placeholder="Category" className="border rounded px-3 py-2" required />
        <input name="unit" placeholder="Unit (e.g. each, g)" className="border rounded px-3 py-2" required />
        <input name="defaultPrice" type="number" step="0.01" min="0" placeholder="Default Price (USD)" className="border rounded px-3 py-2" required />

        <div className="md:col-span-3 font-semibold mt-2">Vendor</div>
        <input name="vendorCode" placeholder="Vendor Code" className="border rounded px-3 py-2" required />
        <input name="vendorCompany" placeholder="Vendor Company (optional)" className="border rounded px-3 py-2" />

        <div className="md:col-span-3 font-semibold mt-2">Batch</div>
        <input name="lotNumber" placeholder="Lot Number" className="border rounded px-3 py-2" required />
        <input name="dateReceived" type="date" className="border rounded px-3 py-2" required />
        <input name="quantity" type="number" min="1" step="1" placeholder="Quantity" className="border rounded px-3 py-2" required />
        <input name="unitCost" type="number" step="0.01" min="0" placeholder="Unit Cost (USD)" className="border rounded px-3 py-2" required />

        <div className="md:col-span-3 font-semibold mt-2">Terms</div>
        <select name="terms" className="border rounded px-3 py-2">
          <option value="COD">COD</option>
          <option value="NET">Net-X</option>
          <option value="CONSIGNMENT">Consignment</option>
        </select>
        <input name="netDays" type="number" min="0" placeholder="Net Days (for Net-X)" className="border rounded px-3 py-2" />

        <div className="md:col-span-3 font-semibold mt-2">Other</div>
        <textarea name="notes" placeholder="Notes (internal)" className="border rounded px-3 py-2 md:col-span-3" rows={3} />
        <textarea name="metadata" placeholder='Metadata JSON (e.g. {"coaUrl":"https://..."})' className="border rounded px-3 py-2 md:col-span-3" rows={3} />

        <div className="md:col-span-3 mt-4">
          <button type="submit" className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
        </div>
      </form>
    </div>
  )
}
