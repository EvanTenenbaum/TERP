import { nextInvoiceNumber } from '@/lib/sequences'

// This module can be imported in dev to verify sequences are available
export async function pingSequences() {
  if (process.env.NODE_ENV !== 'development') return
  try { await nextInvoiceNumber() } catch {}
}
