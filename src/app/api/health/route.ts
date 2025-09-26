import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({})(async () => {
  return ok({ ok: true })
})
