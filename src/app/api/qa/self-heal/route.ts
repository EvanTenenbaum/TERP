import { api } from '@/lib/api'
import * as Sentry from '@sentry/nextjs'
import { runSelfHeal } from '@/lib/selfHeal'
import { ok, err } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const GET = api({})(async () => {
  if (process.env.ENABLE_QA_CRONS !== 'true') {
    return err('disabled', 404)
  }
  try {
    const { fixes, errors, postingLocked } = await runSelfHeal()
    return ok({ ok: true, fixes, errors, postingLocked })
  } catch (e) {
    Sentry.captureException(e)
    return err('self_heal_failed', 500)
  }
})
