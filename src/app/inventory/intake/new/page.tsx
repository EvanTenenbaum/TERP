"use client"
"use client"
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { normalizeFlowerProductName } from '@/lib/normalization'
import { mutate as swrMutate } from 'swr'
import { FormEngine } from '@/lib/forms/engine'
import { z } from 'zod'

const intakeSchema = z.object({
  retailName: z.string().min(1, 'Retail name is required'),
  standardStrainName: z.string().optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  defaultPrice: z.string().optional().or(z.literal('')),
  vendorCode: z.string().min(1, 'Vendor code is required'),
  vendorCompany: z.string().optional().or(z.literal('')),
  lotNumber: z.string().min(1, 'Lot number is required'),
  dateReceived: z.string().min(1, 'Date received is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unitCost: z.string().min(1, 'Unit cost is required'),
  terms: z.enum(['COD','NET','CONSIGNMENT']).default('COD'),
  netDays: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  metadata: z.string().optional().or(z.literal('')).refine((v)=>{ if(!v) return true; try{ JSON.parse(v); return true } catch { return false } }, 'Invalid JSON'),
})

export default function IntakePage() {
  const router = useRouter()
  const { push } = useToast()

  function previewName(values: any) {
    const left = (values.vendorCode || '').trim()
    const right = (values.standardStrainName || values.retailName || '').trim()
    const v = normalizeFlowerProductName(left, right)
    return v || (left && right ? `${left} - ${right}` : '')
  }

  async function onSubmit(values: z.infer<typeof intakeSchema>) {
    const payload = {
      retailName: values.retailName,
      standardStrainName: values.standardStrainName || undefined,
      category: values.category,
      unit: values.unit,
      defaultPriceCents: Math.round(parseFloat(values.defaultPrice||'0')*100),
      vendorCode: values.vendorCode,
      vendorCompany: values.vendorCompany || undefined,
      terms: values.terms as any,
      netDays: parseInt(values.netDays||'30')||30,
      dateReceived: new Date(values.dateReceived),
      lotNumber: values.lotNumber,
      quantity: Math.round(parseFloat(values.quantity||'0')),
      unitCostCents: Math.round(parseFloat(values.unitCost||'0')*100),
      notes: values.notes || undefined,
      metadata: values.metadata ? JSON.parse(values.metadata) : undefined,
    }
    const res = await fetch('/api/inventory/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(()=>({}))
    if (!res.ok || !data.success) throw new Error(data.error || 'intake_failed')
    push({ message: 'Intake created' })
    await swrMutate('/api/inventory/products/summary')
    router.push('/inventory')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Add Product (Unified Intake)</h1>
      <div className="bg-white rounded shadow p-4 space-y-4">
        <div className="text-sm text-gray-600">Customer-facing name preview updates as you type.</div>
        <FormEngine
          schema={intakeSchema}
          initial={{ unit: 'each', terms: 'COD', dateReceived: new Date().toISOString().slice(0,10) }}
          onSubmit={onSubmit}
          submitLabel="Save"
          fields={[
            { name: 'retailName', label: 'Retail Name', type: 'text', required: true },
            { name: 'standardStrainName', label: 'Standard Strain (optional)', type: 'text' },
            { name: 'category', label: 'Category', type: 'text', required: true },
            { name: 'unit', label: 'Unit (e.g. each, g)', type: 'text', required: true },
            { name: 'defaultPrice', label: 'Default Price (USD)', type: 'number', hint: 'Optional' },
            { name: 'vendorCode', label: 'Vendor Code', type: 'text', required: true },
            { name: 'vendorCompany', label: 'Vendor Company (optional)', type: 'text' },
            { name: 'lotNumber', label: 'Lot Number', type: 'text', required: true },
            { name: 'dateReceived', label: 'Date Received', type: 'date', required: true },
            { name: 'quantity', label: 'Quantity', type: 'number', required: true },
            { name: 'unitCost', label: 'Unit Cost (USD)', type: 'number', required: true },
            { name: 'terms', label: 'Terms', type: 'select', options: [
              { value: 'COD', label: 'COD' },
              { value: 'NET', label: 'Net-X' },
              { value: 'CONSIGNMENT', label: 'Consignment' },
            ] },
            { name: 'netDays', label: 'Net Days (for Net-X)', type: 'number' },
            { name: 'notes', label: 'Notes (internal)', type: 'textarea' },
            { name: 'metadata', label: 'Metadata JSON', type: 'textarea', hint: 'e.g. {"coaUrl":"https://..."}' },
          ]}
        />
      </div>
    </div>
  )
}
