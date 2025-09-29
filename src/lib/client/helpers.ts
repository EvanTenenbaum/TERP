export function computeCreditSuggestions(input: {
  recentAvgOpenCents: number
  onTimePct: number
  worstLateDays: number
  currentLimitCents: number
}) {
  const { recentAvgOpenCents, onTimePct, worstLateDays, currentLimitCents } = input
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)))
  const base = recentAvgOpenCents || currentLimitCents || 0

  const conservative = clamp(
    base * (onTimePct >= 0.9 ? 1.2 : 1.0),
    Math.min(base, currentLimitCents || base),
    (currentLimitCents || base) * 1.2
  )
  const moderate = clamp(
    base * 1.5,
    currentLimitCents || base,
    (currentLimitCents || base) * (worstLateDays > 30 ? 1.2 : 1.6)
  )
  const aggressive = clamp(
    base * 2.0,
    currentLimitCents || base,
    (currentLimitCents || base) * (worstLateDays > 30 ? 1.4 : 2.0)
  )
  return { conservative, moderate, aggressive }
}
