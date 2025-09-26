type Bucket = { tokens: number; last: number }

const buckets = new Map<string, Bucket>()

const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_TOKENS ?? 120) // requests
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000) // 1 minute

export function rateLimit(key: string, tokens: number = DEFAULT_LIMIT, windowMs: number = DEFAULT_WINDOW_MS) {
  const now = Date.now()
  const b = buckets.get(key) || { tokens, last: now }
  const elapsed = now - b.last
  const refill = Math.floor((elapsed / windowMs) * tokens)
  const nextTokens = Math.min(tokens, b.tokens + Math.max(0, refill)) - 1
  const allowed = nextTokens >= 0
  buckets.set(key, { tokens: Math.max(0, nextTokens), last: allowed ? now : b.last })
  return { allowed, remaining: Math.max(0, nextTokens) }
}

export function rateKeyFromRequest(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || (req as any).ip || 'unknown'
  return `ip:${ip}`
}
