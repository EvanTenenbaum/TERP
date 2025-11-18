import { Sentry, setupSentryErrorHandler } from "../../sentry.server.config";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Initialize monitoring and error tracking
 * Note: Sentry is now initialized in sentry.server.config.ts
 */
export function initMonitoring() {
  if (process.env.SENTRY_DSN) {
    console.log("✓ Sentry monitoring initialized");
  } else if (isProduction) {
    console.warn("⚠ Sentry DSN not configured - error tracking disabled");
  } else {
    console.log("ℹ Sentry disabled in development (set SENTRY_DSN to enable)");
  }
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
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
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Setup Sentry Express error handler
 * Call this after all routes are defined
 */
export function setupErrorHandler(app: any) {
  if (process.env.SENTRY_DSN) {
    setupSentryErrorHandler(app);
  }
}
