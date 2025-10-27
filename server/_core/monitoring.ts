import * as Sentry from "@sentry/node";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Initialize monitoring and error tracking
 */
export function initMonitoring() {
  if (isProduction && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% of requests
      integrations: [
        Sentry.httpIntegration(),
      ],
    });
    
    console.log("✓ Sentry monitoring initialized");
  } else if (isProduction) {
    console.warn("⚠ Sentry DSN not configured - error tracking disabled");
  }
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (isProduction) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture message with severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  if (isProduction) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Get Sentry request handler middleware
 */
export function getRequestHandler() {
  // Sentry v10 doesn't use Handlers, return a no-op middleware
  return (req: any, res: any, next: any) => next();
}

/**
 * Get Sentry error handler middleware
 */
export function getErrorHandler() {
  // Sentry v10 doesn't use Handlers, return a no-op middleware
  return (err: any, req: any, res: any, next: any) => {
    captureException(err);
    next(err);
  };
}

