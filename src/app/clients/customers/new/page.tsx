"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { createCustomer } from '@/actions/customers'
import { useToast } from '@/components/ui/Toast'

export default function NewCustomerPage() {
  const router = useRouter()
  const { push } = useToast()
  const [form, setForm] = useState({ companyName: '', email: '', phone: '', address: '', contactPerson: '', creditLimit: '', paymentTerms: '' })
  const [loading, setLoading] = useState(false)
  const onChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value })
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await createCustomer({ companyName: form.companyName, contactInfo: { email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, contactPerson: form.contactPerson || undefined }, creditLimit: form.creditLimit ? Math.round(Number(form.creditLimit) * 100) : undefined, paymentTerms: form.paymentTerms || undefined })
      if (!res.success) throw new Error(res.error || 'failed')
      push({ message: 'Customer created' })
      router.push('/clients/customers')
    } catch (err: any) {
      push({ message: err?.message || 'Failed to create customer' })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Add Customer" />
      <form onSubmit={submit} className="bg-white rounded border p-4 grid gap-3 md:grid-cols-2">
        <input name="companyName" value={form.companyName} onChange={onChange} placeholder="Company Name" className="border rounded px-3 py-2" required />
        <input name="contactPerson" value={form.contactPerson} onChange={onChange} placeholder="Contact Person" className="border rounded px-3 py-2" />
        <input name="email" value={form.email} onChange={onChange} placeholder="Email" className="border rounded px-3 py-2" />
        <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="border rounded px-3 py-2" />
        <input name="address" value={form.address} onChange={onChange} placeholder="Address" className="border rounded px-3 py-2 md:col-span-2" />
        <input name="creditLimit" value={form.creditLimit} onChange={onChange} placeholder="Credit Limit (USD)" type="number" step="0.01" className="border rounded px-3 py-2" />
        <input name="paymentTerms" value={form.paymentTerms} onChange={onChange} placeholder="Payment Terms (e.g., Net 30)" className="border rounded px-3 py-2" />
        <div className="md:col-span-2 flex gap-2 justify-end mt-2">
          <button type="button" onClick={()=>router.back()} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
