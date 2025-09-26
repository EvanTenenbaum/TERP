import prisma from '@/lib/prisma'
import { createReadStream } from 'fs'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const out: string[] = []
  if (q.length === 0) return ok({ results: out })
  try {
    const db = await prisma.variety.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, take: 10 })
    out.push(...db.map(v => v.name))
  } catch {}

  if (out.length < 10) {
    try {
      const stream = createReadStream('data/strains_openthc.csv', { encoding: 'utf8' })
      const chunks: string[] = []
      for await (const chunk of stream as any as AsyncIterable<string>) chunks.push(chunk)
      const lines = chunks.join('')
        .split(/\r?\n/)
        .map(l => l.split(',')[0])
        .filter(Boolean)
      const matches = lines.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 10 - out.length)
      out.push(...matches)
    } catch {}
  }
  return ok({ results: Array.from(new Set(out)).slice(0, 10) })
})
