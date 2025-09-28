"use client"
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { normalizeFlowerProductName } from '@/lib/normalization'
import { mutate as swrMutate } from 'swr'

export default function IntakePage() {
  const router = useRouter()
  const { push } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    retailName: '',
    standardStrainName: '',
    category: '',
    unit: 'each',
    defaultPrice: '',
    vendorCode: '',
    vendorCompany: '',
    lotNumber: '',
    dateReceived: new Date().toISOString().slice(0,10),
    quantity: '',
    unitCost: '',
    terms: 'COD',
    netDays: '30',
    notes: '',
    metadata: ''
  })
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const normalizedName = useMemo(()=>{
    const left = form.vendorCode.trim()
    const right = (form.standardStrainName || form.retailName).trim()
    const v = normalizeFlowerProductName(left, right)
    return v || (left && right ? `${left} - ${right}` : '')
  }, [form.vendorCode, form.standardStrainName, form.retailName])

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'metadata') {
      if (!value) { setMetadataError(null); return }
      try { JSON.parse(value); setMetadataError(null) } catch { setMetadataError('Invalid JSON') }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (metadataError) { push({ message: 'Fix Metadata JSON before submitting' }); return }
    setIsSubmitting(true)
    try {
      const payload = {
        retailName: form.retailName,
        standardStrainName: form.standardStrainName || undefined,
        category: form.category,
        unit: form.unit,
        defaultPriceCents: Math.round(parseFloat(form.defaultPrice||'0')*100),
        vendorCode: form.vendorCode,
        vendorCompany: form.vendorCompany || undefined,
        terms: form.terms as any,
        netDays: parseInt(form.netDays||'30')||30,
        dateReceived: new Date(form.dateReceived),
        lotNumber: form.lotNumber,
        quantity: Math.round(parseFloat(form.quantity||'0')),
        unitCostCents: Math.round(parseFloat(form.unitCost||'0')*100),
        notes: form.notes || undefined,
        metadata: form.metadata ? JSON.parse(form.metadata) : undefined,
      }
      const res = await fetch('/api/inventory/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'intake_failed')
      push({ message: 'Intake created' })
      await swrMutate('/api/inventory/products/summary')
      router.push('/inventory')
    } catch (err: any) {
      push({ message: err?.message || 'Failed to create intake' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitDisabled = isSubmitting || !!metadataError || !form.retailName || !form.category || !form.unit || !form.vendorCode || !form.lotNumber || !form.dateReceived || !form.quantity || !form.unitCost

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Add Product (Unified Intake)</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded shadow p-4">
        <div className="md:col-span-3 font-semibold">Product</div>
        <input name="retailName" value={form.retailName} onChange={onChange} placeholder="Retail Name" className="border rounded px-3 py-2" required />
        <input name="standardStrainName" value={form.standardStrainName} onChange={onChange} placeholder="Standard Strain (optional)" className="border rounded px-3 py-2" />
        <input name="category" value={form.category} onChange={onChange} placeholder="Category" className="border rounded px-3 py-2" required />
        <input name="unit" value={form.unit} onChange={onChange} placeholder="Unit (e.g. each, g)" className="border rounded px-3 py-2" required />
        <input name="defaultPrice" value={form.defaultPrice} onChange={onChange} type="number" step="0.01" min="0" placeholder="Default Price (USD)" className="border rounded px-3 py-2" />

        <div className="md:col-span-3 text-sm text-gray-600 -mt-2">Customer-facing name preview: {normalizedName || '—'}</div>

        <div className="md:col-span-3 font-semibold mt-2">Vendor</div>
        <input name="vendorCode" value={form.vendorCode} onChange={onChange} placeholder="Vendor Code" className="border rounded px-3 py-2" required />
        <input name="vendorCompany" value={form.vendorCompany} onChange={onChange} placeholder="Vendor Company (optional)" className="border rounded px-3 py-2" />

        <div className="md:col-span-3 font-semibold mt-2">Batch</div>
        <input name="lotNumber" value={form.lotNumber} onChange={onChange} placeholder="Lot Number" className="border rounded px-3 py-2" required />
        <input name="dateReceived" value={form.dateReceived} onChange={onChange} type="date" className="border rounded px-3 py-2" required />
        <input name="quantity" value={form.quantity} onChange={onChange} type="number" min="1" step="1" placeholder="Quantity" className="border rounded px-3 py-2" required />
        <input name="unitCost" value={form.unitCost} onChange={onChange} type="number" step="0.01" min="0" placeholder="Unit Cost (USD)" className="border rounded px-3 py-2" required />

        <div className="md:col-span-3 font-semibold mt-2">Terms</div>
        <select name="terms" value={form.terms} onChange={onChange} className="border rounded px-3 py-2">
          <option value="COD">COD</option>
          <option value="NET">Net-X</option>
          <option value="CONSIGNMENT">Consignment</option>
        </select>
        <input name="netDays" value={form.netDays} onChange={onChange} type="number" min="0" placeholder="Net Days (for Net-X)" className="border rounded px-3 py-2" />

        <div className="md:col-span-3 font-semibold mt-2">Other</div>
        <textarea name="notes" value={form.notes} onChange={onChange} placeholder="Notes (internal)" className="border rounded px-3 py-2 md:col-span-3" rows={3} />
        <div className="md:col-span-3">
          <textarea name="metadata" value={form.metadata} onChange={onChange} placeholder='Metadata JSON (e.g. {"coaUrl":"https://..."})' className={`border rounded px-3 py-2 w-full ${metadataError ? 'border-red-500' : ''}`} rows={3} />
          {metadataError ? <div className="text-red-600 text-sm mt-1">{metadataError}</div> : null}
        </div>

        <div className="md:col-span-3 mt-4 flex gap-3">
          <button type="button" onClick={()=>router.back()} className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitDisabled} className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
