export function validateOverrideInput(unitPrice: number, reason: string): { ok: true } | { ok: false; error: string } {
  const price = Math.round(Number(unitPrice))
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: 'invalid_price' }
  // Max $100,000 in cents per unit to prevent fat-fingered entries
  if (price > 10_000_000) return { ok: false, error: 'price_too_high' }
  const r = String(reason || '').trim()
  if (!r) return { ok: false, error: 'reason_required' }
  if (r.length > 256) return { ok: false, error: 'reason_too_long' }
  return { ok: true }
}
