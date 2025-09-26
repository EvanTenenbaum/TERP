import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (Sentry.getCurrentHub().getClient()) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    tracesSampleRate: 0.1,
    debug: false,
  })
}
