import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok } from '@/lib/http'
import { generateSalesSheetPDFBuffer } from '@/lib/pdf/quote'

export const GET = api({})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('quoteId') || undefined

  const results: Record<string, any> = {}

  // Samples list
  try {
    const cnt = await prisma.sampleTransaction.count()
    results.samplesList = cnt >= 0
  } catch { results.samplesList = false }

  // Consignment sub-batches list
  try {
    const cnt = await (prisma as any).subBatch.count()
    results.subBatchesList = cnt >= 0
  } catch { results.subBatchesList = false }

  // AR aging CSV generation (in-memory)
  try {
    const ars = await prisma.accountsReceivable.findMany({ where: { balanceRemaining: { gt: 0 } }, include: { customer: true } })
    const now = new Date()
    const rows: string[][] = [[ 'Customer', 'InvoiceId', 'BalanceRemaining', 'DaysPastDue', 'Bucket' ]]
    for (const ar of ars) {
      const daysPastDue = ar.dueDate ? Math.floor((now.getTime() - new Date(ar.dueDate).getTime()) / 86400000) : 0
      let bucket = '0-29'
      if (daysPastDue >= 90) bucket = '90+'
      else if (daysPastDue >= 60) bucket = '60-89'
      else if (daysPastDue >= 30) bucket = '30-59'
      rows.push([ ar.customer?.companyName || '', ar.id, String(ar.balanceRemaining), String(daysPastDue), bucket ])
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    results.arAgingCsv = csv.startsWith('Customer,InvoiceId')
  } catch { results.arAgingCsv = false }

  // Sales sheet PDF (optional)
  if (quoteId) {
    try {
      const quote = await prisma.salesQuote.findUnique({
        where: { id: quoteId },
        include: { customer: true, quoteItems: { include: { product: true } } },
      })
      if (quote) {
        const q: any = {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          createdAt: quote.quoteDate,
          customer: { name: (quote as any).customer?.companyName },
          items: quote.quoteItems.map((it: any) => ({ qty: it.quantity, unitPrice: it.unitPrice, product: it.product })),
        }
        const buf = await generateSalesSheetPDFBuffer(q)
        results.salesSheetPdf = (buf?.byteLength || 0) > 100
      } else {
        results.salesSheetPdf = false
      }
    } catch { results.salesSheetPdf = false }
  }

  return ok({ results })
})
