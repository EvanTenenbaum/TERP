import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const vendors = await prisma.vendor.findMany({ where: { isActive: true }, orderBy: { companyName: 'asc' } })
  return NextResponse.json({ success: true, vendors })
}
