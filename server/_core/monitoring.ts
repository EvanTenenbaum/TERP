/**
 * Server-side monitoring and error tracking
 *
 * IMPORTANT: All Sentry operations are wrapped in try-catch to prevent
 * any monitoring issues from affecting the application.
 * Sentry is only enabled when SENTRY_DSN is explicitly set.
 */

let Sentry: typeof import("@sentry/node") | null = null;
let sentryInitialized = false;

const isProduction = process.env.NODE_ENV === "production";
const hasSentryDSN = !!process.env.SENTRY_DSN;

/**
 * Initialize monitoring and error tracking
 * Non-blocking: will log warning and continue if Sentry fails
 */
export function initMonitoring() {
  if (!hasSentryDSN) {
    console.log("ℹ️  Sentry monitoring disabled (no SENTRY_DSN configured)");
    return;
  }

  try {
    // Dynamically import to avoid any issues if Sentry package has problems
    const SentryModule = require("@sentry/node") as typeof import("@sentry/node");
    Sentry = SentryModule;

    SentryModule.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      enabled: true,

      // 10% sampling in production to control costs
      tracesSampleRate: isProduction ? 0.1 : 1.0,

      integrations: [
        SentryModule.httpIntegration(),
        SentryModule.expressIntegration(),
        SentryModule.captureConsoleIntegration({
          levels: ["error", "warn"],
        }),
      ],

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }

        // Filter sensitive query params (only if it's a string)
        if (event.request?.query_string && typeof event.request.query_string === "string") {
          const sanitized = event.request.query_string
            .split("&")
            .filter((param: string) => !param.startsWith("token=") && !param.startsWith("key="))
            .join("&");
          event.request.query_string = sanitized;
        }

        return event;
      },

      // Ignore transient network errors
      ignoreErrors: [
        "ECONNRESET",
        "ENOTFOUND",
        "ETIMEDOUT",
        "socket hang up",
      ],
    });

    sentryInitialized = true;
    console.log("✅ Sentry monitoring initialized");
  } catch (error) {
    console.warn("⚠️  Failed to initialize Sentry monitoring:", error);
    console.log("   Continuing without error tracking...");
    // Non-fatal - app continues without Sentry
  }
}

/**
 * Capture exception with context
 * Non-blocking: will log to console if Sentry unavailable
 */
export function captureException(error: Error, context?: Record<string, any>) {
  // Always log to console for visibility
  console.error("Exception:", error.message);
  if (context) {
    console.error("Context:", JSON.stringify(context, null, 2));
  }

  if (sentryInitialized && Sentry) {
    try {
      const SentryRef = Sentry; // Capture reference for closure
      SentryRef.withScope((scope) => {
        if (context) {
          scope.setContext("additional", context);
        }
        SentryRef.captureException(error);
      });
    } catch (sentryError) {
      // Sentry capture failed - already logged above
      console.warn("Failed to send to Sentry:", sentryError);
    }
  }
}

/**
 * Capture message with severity level
 * Non-blocking: will log to console if Sentry unavailable
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
) {
  console.log(`[${level.toUpperCase()}]`, message);

  if (sentryInitialized && Sentry) {
    try {
      Sentry.captureMessage(message, level);
    } catch (sentryError) {
      console.warn("Failed to send message to Sentry:", sentryError);
    }
  }
}

/**
 * Setup Express error handler
 * Non-blocking: will skip if Sentry unavailable
 */
export function setupErrorHandler(app: any) {
  if (!sentryInitialized || !Sentry) {
    console.log("ℹ️  Sentry error handler not configured (Sentry not initialized)");
    return;
  }

  try {
    Sentry.setupExpressErrorHandler(app);
    console.log("✅ Sentry Express error handler configured");
  } catch (error) {
    console.warn("⚠️  Failed to setup Sentry error handler:", error);
    // Non-fatal - app continues without Sentry error handler
  }
}
