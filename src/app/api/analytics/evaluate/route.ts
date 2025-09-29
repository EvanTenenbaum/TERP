import { api } from '@/lib/api'
import { err, ok } from '@/lib/http'
import { reportSpec as reportSpecSchema } from '@/lib/analytics/validation'
import { evaluate } from '@/lib/analytics/engine'
import crypto from 'crypto'
import { getCurrentUserId } from '@/lib/auth'

const cache = new Map<string, { at: number; data: any }>()

export const POST = api<{ spec: any }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], parseJson: true, rate: { key: 'analytics-evaluate', limit: 120 }, bodySchema: reportSpecSchema.transform((v)=>({ spec: v })) })(async ({ json }) => {
  if (!json?.spec) return err('invalid_input', 400)
  const key = `${getCurrentUserId()}:` + crypto.createHash('sha1').update(JSON.stringify(json.spec)).digest('hex')
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.at < 60_000) return ok({ data: cached.data })
  const data = await evaluate(json.spec)
  cache.set(key, { at: now, data })
  return ok({ data })
})
