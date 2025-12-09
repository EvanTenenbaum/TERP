// Sentry temporarily disabled to troubleshoot Railway deployment issues
// import { Sentry, setupSentryErrorHandler } from "../../sentry.server.config";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Initialize monitoring and error tracking
 * Note: Sentry temporarily disabled
 */
export function initMonitoring() {
  console.log("ℹ Monitoring disabled (Sentry removed for troubleshooting)");
}

/**
 * Capture exception with context
 * Note: Sentry temporarily disabled
 */
export function captureException(error: Error, context?: Record<string, any>) {
  // Sentry disabled - just log to console
  console.error("Exception:", error, context);
}

/**
 * Capture message with severity level
 * Note: Sentry temporarily disabled
 */
export function captureMessage(
  message: string,
  level: string = "info"
) {
  // Sentry disabled - just log to console
  console.log(`[${level}]`, message);
}

/**
 * Setup error handler
 * Note: Sentry temporarily disabled
 */
export function setupErrorHandler(app: any) {
  // Sentry disabled - no error handler needed
  console.log("ℹ Sentry error handler disabled");
}
