import * as SentrySDK from '@sentry/nextjs'

export async function register() {
  try {
    const hub = (SentrySDK as any).getCurrentHub?.()
    if (hub?.getClient?.()) return
  } catch {}
  if (!process.env.SENTRY_DSN) return
  SentrySDK.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG === 'true',
  })
  try { const { pingSequences } = await import('@/app/health/sequence'); await pingSequences() } catch {}
}
