import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateQuotePDFBuffer } from '@/lib/pdf/quote'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rl = rateLimit(`${rateKeyFromRequest(req as any)}:quote-pdf`, 30, 60_000)
    if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    const quote = await prisma.salesQuote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'quote_not_found' }, { status: 404 })
    }

    const ci: any = quote.customer.contactInfo || {}

    const pdfData = {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      createdAt: quote.quoteDate,
      validUntil: quote.expirationDate,
      totalAmount: quote.totalAmount,
      notes: null as string | null,
      customer: {
        companyName: quote.customer.companyName,
        contactName: ci.contactPerson ?? null,
        email: ci.email ?? null,
        phone: ci.phone ?? null,
        address: ci.address ?? null,
        city: ci.city ?? null,
        state: ci.state ?? null,
        zipCode: ci.zipCode ?? null,
      },
      items: quote.quoteItems.map((qi) => ({
        id: qi.id,
        quantity: qi.quantity,
        unitPrice: qi.unitPrice,
        lineTotal: qi.lineTotal,
        product: {
          sku: qi.product.sku,
          name: qi.product.name,
          description: null,
          unit: qi.product.unit,
        },
        // vendorCode/location unavailable at quote stage
      })),
    }

    const buffer = await generateQuotePDFBuffer(pdfData as any)

    return new Response(new Uint8Array(buffer as any), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quote-${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF generation failed', err)
    return NextResponse.json({ error: 'pdf_generation_failed' }, { status: 500 })
  }
}
