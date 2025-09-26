import * as Sentry from '@sentry/nextjs'

export async function register() {
  try {
    const hub = (Sentry as any).getCurrentHub?.()
    if (hub?.getClient?.()) return
  } catch {}
  Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    tracesSampleRate: 0.1,
    debug: false,
  })
}
