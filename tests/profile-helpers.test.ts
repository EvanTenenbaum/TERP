import { computeCreditSuggestions } from '@/lib/client/helpers'

test('credit suggestions produce ordered bands', () => {
  const r = computeCreditSuggestions({ recentAvgOpenCents: 100_000, onTimePct: 0.95, worstLateDays: 5, currentLimitCents: 120_000 })
  expect(r.conservative).toBeGreaterThan(0)
  expect(r.moderate).toBeGreaterThanOrEqual(r.conservative)
  expect(r.aggressive).toBeGreaterThanOrEqual(r.moderate)
})
