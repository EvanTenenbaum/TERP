import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { archived } = await req.json()
  const att = await prisma.attachment.update({ where: { id: params.id }, data: { archived: !!archived } })
  return NextResponse.json({ success: true, attachment: att })
}
