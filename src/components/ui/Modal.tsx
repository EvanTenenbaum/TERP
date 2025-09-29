import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import React, { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open: isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const body = (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{title}</h2>
            <button aria-label="Close" onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  )
  return typeof window !== 'undefined' ? createPortal(body, document.body) : body
}
