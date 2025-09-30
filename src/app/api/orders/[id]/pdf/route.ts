import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { err } from '@/lib/http'
import jsPDF from 'jspdf'

export const GET = api({ roles: ['SUPER_ADMIN','SALES'], rate: { key: 'orders-pdf', limit: 30 } })(async ({ params }) => {
  const id = String(params!.id)
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, orderItems: { include: { product: true, batch: true } } } })
  if (!order) return err('not_found', 404)

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  let y = margin

  doc.setFont('helvetica','bold')
  doc.setFontSize(18)
  doc.text('PACKING SLIP', pageWidth/2, y, { align: 'center' })
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica','normal')
  doc.text(`Order: ${order.id}`, margin, y)
  doc.text(`Customer: ${order.customer?.companyName || ''}`, pageWidth - margin, y, { align: 'right' })
  y += 8
  doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, margin, y)
  y += 12

  // Table header
  doc.setFont('helvetica','bold')
  doc.text('SKU', margin, y)
  doc.text('Product', margin+40, y)
  doc.text('Batch', margin+110, y)
  doc.text('Qty', pageWidth - margin, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica','normal')

  for (const it of order.orderItems) {
    if (y > 270) { doc.addPage(); y = margin }
    doc.text(it.product.sku, margin, y)
    doc.text(it.product.name, margin+40, y)
    doc.text(it.batchId || '-', margin+110, y)
    doc.text(String(it.quantity), pageWidth - margin, y, { align: 'right' })
    y += 6
  }

  const pdf = doc.output('arraybuffer') as ArrayBuffer
  return new Response(Buffer.from(pdf), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="packing_${order.id}.pdf"` } })
})
