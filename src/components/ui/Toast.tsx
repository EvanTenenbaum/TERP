'use client'
import React, { createContext, useCallback, useContext, useState } from 'react'

type Toast = { id: number; message: string; actionText?: string; onAction?: () => void }

type ToastCtx = { push: (t: Omit<Toast, 'id'>) => void }

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random()*1000)
    setToasts((list)=> [...list, { id, ...t }])
    setTimeout(()=> setToasts((list)=> list.filter(x=> x.id !== id)), 5000)
  }, [])
  const dismiss = (id: number) => setToasts((list)=> list.filter(x=> x.id !== id))
  const onAction = (toast: Toast) => { try { toast.onAction?.() } finally { dismiss(toast.id) } }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="bg-gray-900 text-white rounded shadow px-3 py-2 text-sm flex items-center gap-3">
            <span>{t.message}</span>
            {t.actionText ? <button onClick={()=>onAction(t)} className="ml-2 underline">{t.actionText}</button> : null}
            <button aria-label="Dismiss" onClick={()=>dismiss(t.id)} className="ml-2 text-gray-300 hover:text-white">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
