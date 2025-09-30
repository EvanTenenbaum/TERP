import prisma from '@/lib/prisma'

export async function nextInvoiceNumber(): Promise<string> {
  // Strategy: find most recent invoice, parse numeric suffix, increment.
  const last = await prisma.accountsReceivable.findFirst({ orderBy: { createdAt: 'desc' }, select: { invoiceNumber: true } })
  const base = last?.invoiceNumber || ''
  const m = base.match(/(\d+)$/)
  const nextNum = m ? String(parseInt(m[1], 10) + 1).padStart(m[1].length, '0') : '0001'
  const prefix = m ? base.slice(0, base.length - m[1].length) : 'INV-'
  return `${prefix}${nextNum}`
}
