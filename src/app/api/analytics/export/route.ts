import { api } from '@/lib/api'
import { err } from '@/lib/http'
import prisma from '@/lib/prisma'
import { getCurrentRole } from '@/lib/auth'
import { hideSensitiveForRole } from '@/lib/reports/sanitize'

function toCsv(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const escape = (v:any) => '"' + String(v ?? '').replace(/"/g,'""') + '"'
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map(h => escape((r as any)[h])).join(','))
  return lines.join('\n')
}

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'analytics-export', limit: 30 } })(async ({ req }) => {
  const sp = new URL(req.url).searchParams
  const reportId = sp.get('reportId')
  const snapshotId = sp.get('snapshotId')
  if (!reportId && !snapshotId) return err('invalid_input', 400)
  let rows: any[] = []
  if (snapshotId) {
    const snap = await prisma.reportSnapshot.findUnique({ where: { id: snapshotId } })
    if (!snap) return err('not_found', 404)
    rows = (snap.data as any)?.rows || []
  } else if (reportId) {
    const rep = await prisma.reportDefinition.findUnique({ where: { id: reportId } })
    if (!rep) return err('not_found', 404)
    const data = (rep as any).lastEvaluatedData?.rows || []
    rows = data
  }
  rows = hideSensitiveForRole(rows, getCurrentRole())
  const csv = toCsv(rows)
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="report.csv"' } })
})
