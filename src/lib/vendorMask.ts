export function maskVendorName(name: string, role?: string) {
  if (role === 'SUPER_ADMIN' || role === 'ACCOUNTING') return name
  const keep = Math.min(2, name.length)
  return name.slice(0, keep) + '•'.repeat(Math.max(0, name.length - keep))
}
