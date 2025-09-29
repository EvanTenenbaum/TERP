export function formatCurrency(amount: number, currency: string = 'USD') {
  return amount.toLocaleString(undefined, { style: 'currency', currency })
}
