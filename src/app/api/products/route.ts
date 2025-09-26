import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true } , orderBy: { sku: 'asc' } })
  return NextResponse.json({ success: true, products })
}
