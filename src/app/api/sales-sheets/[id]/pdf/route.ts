import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { generateSalesSheetPDFBuffer } from '@/lib/pdf/quote'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES'],
  rate: { key: 'sales-sheet-pdf', limit: 30 },
})(async ({ params }) => {
  const id = params!.id
  const quote = await prisma.salesQuote.findUnique({
    where: { id },
    include: { customer: true, quoteItems: { include: { product: true } } },
  })
  if (!quote) return new Response(JSON.stringify({ success:false, error: 'quote_not_found' }), { status: 404, headers: { 'Content-Type':'application/json' } })

  // Map to expected structure by PDF helper
  const q: any = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    createdAt: quote.quoteDate,
    customer: { name: quote.customer.companyName },
    items: quote.quoteItems.map(it => ({ qty: it.quantity, unitPrice: it.unitPrice, product: it.product })),
  }

  const buf = await generateSalesSheetPDFBuffer(q)
  return new Response(new Uint8Array(buf as any), { headers: { 'Content-Type':'application/pdf', 'Content-Disposition': `inline; filename="sales-sheet-${id}.pdf"` } })
})
