import * as Sentry from '@sentry/nextjs';

export function startSpan<T>(name: string, fn: () => Promise<T>, data?: Record<string, any>): Promise<T> {
  return Sentry.startSpan({ name, attributes: data || {} }, fn);
}

export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({ message, data });
}
