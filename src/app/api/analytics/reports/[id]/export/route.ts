import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { err } from '@/lib/http'
import { evaluate } from '@/lib/analytics/engine'
import { hideSensitiveForRole } from '@/lib/reports/sanitize'
import { getCurrentRole } from '@/lib/auth'

function toCsv(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const escape = (v:any) => '"' + String(v ?? '').replace(/"/g,'""') + '"'
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map(h => escape((r as any)[h])).join(','))
  return lines.join('\n')
}

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'report-export', limit: 30 } })(async ({ params }) => {
  const id = params?.id as string
  const rep = await prisma.reportDefinition.findUnique({ where: { id } })
  if (!rep) return err('not_found', 404)
  const data = await evaluate(rep.spec as any)
  const rows = hideSensitiveForRole((data?.rows ?? []) as any[], getCurrentRole())
  const csv = toCsv(rows)
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${rep.name.replace(/[^a-z0-9-_]+/gi,'_')}.csv"` } })
})
