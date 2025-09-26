import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { promises as fs } from 'fs'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response('bad_request', { status: 400 })
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return new Response('not_found', { status: 404 })
  const buf = await fs.readFile(att.filePath)
  return new Response(buf, { headers: { 'Content-Type': att.mimeType, 'Content-Disposition': `inline; filename="${att.fileName}"` } })
}
