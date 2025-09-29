"use client"
import React, { useState } from 'react'
import { z, ZodTypeAny } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date'

export type FieldOption = { label: string; value: string }

export type FieldConfig = {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  options?: FieldOption[]
  required?: boolean
  hint?: string
}

export type FormEngineProps<T extends ZodTypeAny> = {
  schema: T
  fields: FieldConfig[]
  initial?: Record<string, any>
  onSubmit: (values: z.infer<T>) => Promise<void> | void
  submitLabel?: string
}

export function FormEngine<T extends ZodTypeAny>({ schema, fields, initial = {}, onSubmit, submitLabel = 'Save' }: FormEngineProps<T>) {
  const [values, setValues] = useState<Record<string, any>>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set(name: string, val: any) { setValues((v) => ({ ...v, [name]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const map: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        if (!map[key]) map[key] = issue.message
      }
      setErrors(map)
      return
    }
    setErrors({})
    setSubmitting(true)
    try { await onSubmit(parsed.data) } finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => {
        const err = errors[f.name]
        const val = values[f.name]
        const common = { id: f.name, name: f.name, value: val ?? '', onChange: (e: any)=> set(f.name, e.target?.type === 'checkbox' ? !!e.target?.checked : e.target?.value), placeholder: f.placeholder }
        return (
          <div key={f.name} className="space-y-1">
            <label htmlFor={f.name} className="block text-sm font-medium text-gray-700">{f.label}{f.required ? <span className="text-danger-600"> *</span> : null}</label>
            {f.type === 'text' && (
              <Input {...common as any} />
            )}
            {f.type === 'number' && (
              <Input {...common as any} type="number" inputMode="decimal" />
            )}
            {f.type === 'textarea' && (
              <textarea {...common as any} rows={3} className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
            )}
            {f.type === 'date' && (
              <Input {...common as any} type="date" />
            )}
            {f.type === 'checkbox' && (
              <div className="flex items-center gap-2">
                <input id={f.name} name={f.name} type="checkbox" checked={!!val} onChange={(e)=> set(f.name, e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-border rounded" />
                <span className="text-sm text-gray-700">{f.hint || f.placeholder}</span>
              </div>
            )}
            {f.type === 'select' && (
              <select {...common as any} className="block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
                <option value="">Select…</option>
                {(f.options || []).map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {f.hint && !err ? <p className="text-xs text-gray-500">{f.hint}</p> : null}
            {err ? <p className="text-xs text-danger-600" role="alert">{err}</p> : null}
          </div>
        )
      })}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  )
}
