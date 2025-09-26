export function csvStringify(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map(r => r.map(f => {
      const s = f == null ? '' : String(f)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
    .join('\n')
}

export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]): Response {
  const csv = csvStringify(rows)
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
