import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','SALES','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const key = `${rateKeyFromRequest(req)}:attachments-upload`
  const rl = rateLimit(key, 30, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const entityType = String(form.get('entityType') || '')
  const entityId = String(form.get('entityId') || '')
  if (!file || !entityType || !entityId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const mime = file.type || 'application/octet-stream'
  const allowed = ['image/jpeg', 'image/webp', 'application/pdf']
  if (!allowed.includes(mime)) return NextResponse.json({ error: 'invalid_type' }, { status: 415 })

  // Per-entity limit
  const existingCount = await prisma.attachment.count({ where: { entityType, entityId, archived: false } })
  if (existingCount >= 50) return NextResponse.json({ error: 'too_many_attachments' }, { status: 429 })

  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  await fs.mkdir(uploadDir, { recursive: true })
  const baseName = path.basename(file.name || 'upload')
  const stamp = Date.now()
  const fileName = `${stamp}-${baseName}`
  const filePath = path.join(uploadDir, fileName)
  const ab = await file.arrayBuffer()

  // Size limit 10MB
  if (ab.byteLength > 10 * 1024 * 1024) return NextResponse.json({ error: 'file_too_large' }, { status: 413 })

  await fs.writeFile(filePath, Buffer.from(ab))

  const stat = await fs.stat(filePath)
  const att = await prisma.attachment.create({ data: { entityType, entityId, fileName: baseName, filePath, mimeType: mime, fileSize: stat.size } })
  return NextResponse.json({ ok: true, attachment: { id: att.id, fileName: att.fileName, url: `/api/attachments/file?id=${att.id}` } })
}
