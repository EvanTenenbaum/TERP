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
  if (!file || !entityType || !entityId) return err('invalid_input', 400)
  const mime = file.type || 'application/octet-stream'
  const allowed = ['image/jpeg', 'image/webp', 'application/pdf']
  if (!allowed.includes(mime)) return err('invalid_type', 415)

  const existingCount = await prisma.attachment.count({ where: { entityType, entityId, archived: false } })
  if (existingCount >= 50) return err('too_many_attachments', 429)

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  await fs.mkdir(uploadDir, { recursive: true })
  const baseName = path.basename(file.name || 'upload')
  const stamp = Date.now()
  const fileName = `${stamp}-${baseName}`
  const filePath = path.join(uploadDir, fileName)
  const ab = await file.arrayBuffer()

  if (ab.byteLength > 10 * 1024 * 1024) return err('file_too_large', 413)

  await fs.writeFile(filePath, Buffer.from(ab))

  const stat = await fs.stat(filePath)
  const att = await prisma.attachment.create({ data: { entityType, entityId, fileName: baseName, filePath, mimeType: mime, fileSize: stat.size } })
  return ok({ attachment: { id: att.id, fileName: att.fileName, url: `/api/attachments/file?id=${att.id}` } })
})
