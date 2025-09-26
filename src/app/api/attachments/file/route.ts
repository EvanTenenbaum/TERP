import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { promises as fs } from 'fs'
import { getCurrentRole } from '@/lib/auth'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'],
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new Response('bad_request', { status: 400 })
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return new Response('not_found', { status: 404 })
  if (att.archived) {
    const role = getCurrentRole()
    if (!(role === 'SUPER_ADMIN' || role === 'ACCOUNTING')) return new Response('forbidden', { status: 403 })
  }
  // basic path safety
  if (att.filePath.includes('..')) return new Response('forbidden', { status: 403 })
  const buf = await fs.readFile(att.filePath)
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': att.mimeType, 'Content-Disposition': `inline; filename="${att.fileName}"` } })
})
