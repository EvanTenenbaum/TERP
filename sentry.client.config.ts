import * as Sentry from '@sentry/nextjs'

import * as SentrySDK from '@sentry/nextjs'

SentrySDK.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG === 'true',
})
