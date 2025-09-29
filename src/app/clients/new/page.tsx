"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'

export default function NewClientPage() {
  const router = useRouter()
  const { push } = useToast()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', contactPerson: '',
    asCustomer: true, asVendor: false,
    customerCompanyName: '', creditLimit: '', paymentTerms: '',
    vendorCode: '', vendorCompanyName: ''
  })
  const [loading, setLoading] = useState(false)
  const onChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { push({ message: 'Name is required' }); return }
    if (form.asVendor && !form.vendorCode.trim()) { push({ message: 'Vendor code is required when creating a vendor' }); return }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        contactInfo: { email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, contactPerson: form.contactPerson || undefined },
        asCustomer: !!form.asCustomer,
        asVendor: !!form.asVendor,
        customer: form.asCustomer ? { companyName: form.customerCompanyName || form.name, creditLimitCents: form.creditLimit ? Math.round(Number(form.creditLimit)*100) : undefined, paymentTerms: form.paymentTerms || undefined } : undefined,
        vendor: form.asVendor ? { vendorCode: form.vendorCode.trim(), companyName: form.vendorCompanyName || form.name } : undefined,
      }
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(()=>({ success:false }))
      if (!j.success) throw new Error(j.error || 'failed')
      push({ message: 'Client created' })
      router.push('/clients')
    } catch (err: any) {
      push({ message: err?.message || 'Failed to create client' })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Add Client" />
      <form onSubmit={submit} className="bg-white rounded border p-4 grid gap-3 md:grid-cols-2">
        <input name="name" value={form.name} onChange={onChange} placeholder="Client Name" className="border rounded px-3 py-2 md:col-span-2" required />
        <input name="contactPerson" value={form.contactPerson} onChange={onChange} placeholder="Contact Person" className="border rounded px-3 py-2" />
        <input name="email" value={form.email} onChange={onChange} placeholder="Email" className="border rounded px-3 py-2" />
        <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="border rounded px-3 py-2" />
        <input name="address" value={form.address} onChange={onChange} placeholder="Address" className="border rounded px-3 py-2 md:col-span-2" />

        <div className="md:col-span-2 flex items-center gap-6 mt-2">
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="asCustomer" checked={form.asCustomer} onChange={onChange} /> Customer</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="asVendor" checked={form.asVendor} onChange={onChange} /> Vendor</label>
        </div>

        {form.asCustomer && (
          <div className="md:col-span-2 grid gap-3 md:grid-cols-3 border rounded p-3">
            <div className="text-sm font-medium md:col-span-3">Customer Settings</div>
            <input name="customerCompanyName" value={form.customerCompanyName} onChange={onChange} placeholder="Customer Company Name (optional)" className="border rounded px-3 py-2 md:col-span-3" />
            <input name="creditLimit" type="number" step="0.01" value={form.creditLimit} onChange={onChange} placeholder="Credit Limit (USD)" className="border rounded px-3 py-2" />
            <input name="paymentTerms" value={form.paymentTerms} onChange={onChange} placeholder="Payment Terms (e.g., Net 30)" className="border rounded px-3 py-2" />
          </div>
        )}

        {form.asVendor && (
          <div className="md:col-span-2 grid gap-3 md:grid-cols-3 border rounded p-3">
            <div className="text-sm font-medium md:col-span-3">Vendor Settings</div>
            <input name="vendorCode" value={form.vendorCode} onChange={onChange} placeholder="Vendor Code" className="border rounded px-3 py-2" required={form.asVendor} />
            <input name="vendorCompanyName" value={form.vendorCompanyName} onChange={onChange} placeholder="Vendor Company Name (optional)" className="border rounded px-3 py-2 md:col-span-2" />
          </div>
        )}

        <div className="md:col-span-2 flex gap-2 justify-end mt-2">
          <button type="button" onClick={()=>router.back()} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
