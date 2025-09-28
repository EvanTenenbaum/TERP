import * as Sentry from '@sentry/nextjs'

import * as Sentry from '@sentry/nextjs'

export async function register() {
  try {
    const hub = (Sentry as any).getCurrentHub?.()
    if (hub?.getClient?.()) return
  } catch {}
  Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG === 'true',
  })
}
