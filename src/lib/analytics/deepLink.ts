export function canonicalUrlFromRow(row: Record<string, any>): string {
  if (!row) return '/'
  if (row.invoiceId) return `/finance/ar/${row.invoiceId}`
  if (row.customerId) return `/clients/${row.customerId}`
  if (row.productId) return `/inventory/products/${row.productId}`
  if (row.batchId) return `/inventory/batches/${row.batchId}`
  return '/'
}
