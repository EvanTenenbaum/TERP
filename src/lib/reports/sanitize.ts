export function hideSensitiveForRole(rows: any[], role?: string) {
  const isPriv = role === 'SUPER_ADMIN' || role === 'ACCOUNTING'
  if (isPriv) return rows
  return rows.map(r => {
    const { costPerUnitCents, vendorName, ...rest } = r
    return { ...rest }
  })
}
