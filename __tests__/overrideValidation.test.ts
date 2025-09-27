import { validateOverrideInput } from '../src/lib/validation/pricing'

describe('validateOverrideInput', () => {
  it('rejects non-positive price', () => {
    expect(validateOverrideInput(0, 'x')).toEqual({ ok: false, error: 'invalid_price' })
    expect(validateOverrideInput(-5, 'x')).toEqual({ ok: false, error: 'invalid_price' })
  })
  it('rejects too high price', () => {
    expect(validateOverrideInput(10_000_001, 'x')).toEqual({ ok: false, error: 'price_too_high' })
  })
  it('requires reason', () => {
    expect(validateOverrideInput(100, '')).toEqual({ ok: false, error: 'reason_required' })
  })
  it('accepts valid inputs', () => {
    expect(validateOverrideInput(100, 'promo')).toEqual({ ok: true })
  })
})
