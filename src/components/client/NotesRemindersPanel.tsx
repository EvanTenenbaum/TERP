'use client'
import type { ClientProfile } from '@/lib/client/profile'
import { createCrmNote, createReminder } from '@/actions/clients'
import { useState, useTransition } from 'react'

export default function NotesRemindersPanel({ data }: { data: ClientProfile }) {
  const [note, setNote] = useState('')
  const [type, setType] = useState<'call'|'email'|'meeting'|'internal'|'pinned'>('internal')
  const [due, setDue] = useState<string>('')
  const [rem, setRem] = useState<string>('Follow up')
  const [isPending, start] = useTransition()

  const customerId = data.customer?.id
  const vendorId = data.vendor?.id

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-3 rounded border p-4">
        <div className="text-sm font-semibold">Add Note</div>
        <select className="w-full rounded border px-2 py-1 text-sm" value={type} onChange={(e)=>setType(e.target.value as any)}>
          <option value="internal">Internal</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="pinned">Pinned</option>
        </select>
        <textarea className="h-28 w-full rounded border px-3 py-2 text-sm" value={note} onChange={(e)=>setNote(e.target.value)} />
        <button
          className="rounded border px-3 py-1 text-sm"
          disabled={isPending || (!note)}
          onClick={()=>start(async ()=>{
            await createCrmNote({
              customerId: customerId ?? undefined,
              vendorId: vendorId ?? undefined,
              type,
              content: note,
              revalidate: `/clients/${data.party.id}`,
            })
            setNote('')
          })}
        >
          {isPending ? 'Saving…' : 'Save Note'}
        </button>
      </div>

      {customerId && (
        <div className="space-y-3 rounded border p-4">
          <div className="text-sm font-semibold">Add Reminder (Customer)</div>
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Reminder note" value={rem} onChange={(e)=>setRem(e.target.value)} />
          <input className="w-full rounded border px-3 py-2 text-sm" type="date" value={due} onChange={(e)=>setDue(e.target.value)} />
          <button
            className="rounded border px-3 py-1 text-sm"
            disabled={isPending || !due}
            onClick={()=>start(async ()=>{
              await createReminder({
                customerId,
                note: rem,
                dueDate: new Date(due).toISOString(),
                revalidate: `/clients/${data.party.id}`,
              })
              setDue('')
            })}
          >
            {isPending ? 'Saving…' : 'Save Reminder'}
          </button>
        </div>
      )}
    </div>
  )
}
