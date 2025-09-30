import * as Sentry from '@sentry/nextjs'

export function withSentryScope<T>(tags: Record<string, string | number | boolean>, fn: () => Promise<T> | T) {
  return Sentry.withScope(async (scope) => {
    Object.entries(tags).forEach(([k, v]) => scope.setTag(k, String(v)))
    try {
      return await fn()
    } catch (e) {
      Sentry.captureException(e)
      throw e
    }
  })
}

export function setRequestScope(req: Request, routeKey?: string) {
  try {
    const url = new URL(req.url)
    Sentry.setTag('route', routeKey || url.pathname)
    Sentry.setTag('method', req.method)
  } catch {}
}
