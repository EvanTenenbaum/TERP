export function formatInvoiceNumber(numeric: number): string {
  const s = numeric.toString().padStart(6, '0');
  return `INV-${s}`;
}
