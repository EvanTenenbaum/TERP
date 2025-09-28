import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import { ok, err } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const POST = api({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'attachments-upload', limit: 60 },
})(async ({ req }) => {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const entityType = String(form.get('entityType') || '')
  const entityId = String(form.get('entityId') || '')
  if (!file || !entityType || !entityId) return new Response(JSON.stringify({ success:false, error: 'invalid_input' }), { status: 400, headers: { 'Content-Type':'application/json' } })
  const mime = file.type || 'application/octet-stream'
  const allowed = ['image/jpeg', 'image/webp', 'application/pdf']
  if (!allowed.includes(mime)) return new Response(JSON.stringify({ success:false, error: 'invalid_type' }), { status: 415, headers: { 'Content-Type':'application/json' } })

  const existingCount = await prisma.attachment.count({ where: { entityType, entityId, archived: false } })
  if (existingCount >= 50) return new Response(JSON.stringify({ success:false, error: 'too_many_attachments' }), { status: 429, headers: { 'Content-Type':'application/json' } })

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  await fs.mkdir(uploadDir, { recursive: true })
  const baseName = path.basename(file.name || 'upload')
  const stamp = Date.now()
  const fileName = `${stamp}-${baseName}`
  const filePath = path.join(uploadDir, fileName)
  const ab = await file.arrayBuffer()

  if (ab.byteLength > 10 * 1024 * 1024) return new Response(JSON.stringify({ success:false, error: 'file_too_large' }), { status: 413, headers: { 'Content-Type':'application/json' } })

  await fs.writeFile(filePath, Buffer.from(ab))

  const stat = await fs.stat(filePath)
  const att = await prisma.attachment.create({ data: { entityType, entityId, fileName: baseName, filePath, mimeType: mime, fileSize: stat.size } })
  return new Response(JSON.stringify({ success:true, attachment: { id: att.id, fileName: att.fileName, url: `/api/attachments/file?id=${att.id}` } }), { headers: { 'Content-Type':'application/json' } })
})
