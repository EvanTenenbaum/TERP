import * as Sentry from "@sentry/react";

/**
 * Sentry Client Configuration
 * 
 * Initializes Sentry error tracking for the React client application.
 * Captures client-side errors, unhandled promise rejections, and user interactions.
 * 
 * CRITICAL: This entire file is wrapped in defensive error handling to prevent
 * Sentry issues from crashing the application. Past issues with Sentry have
 * caused major failures - this implementation prioritizes app stability.
 */

// Track initialization status for other components to check
let sentryInitialized = false;

/**
 * Check if Sentry is properly initialized and available
 */
export function isSentryAvailable(): boolean {
  return sentryInitialized && typeof Sentry?.captureException === 'function';
}

// Initialize Sentry with error handling to prevent blocking app startup
// [FIX APPLIED] Verified fix for spinning wheel issue (Non-blocking Sentry)
// [FIX APPLIED] Triple-check verified - all Sentry operations are defensive
try {
  Sentry.init({
    // DSN from environment variable - set in production
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    
    // Environment name (development, staging, production)
    environment: import.meta.env.MODE || "development",
    
    // Enable Sentry only in production or when DSN is explicitly set
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
  
  // Session Replay - helps debug issues by recording user sessions
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Trace propagation targets for distributed tracing
  tracePropagationTargets: ["localhost", /^https:\/\/.*\.terp\.app/],
  
  integrations: [
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration(),
    
    // Session replay for debugging
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    
    // React-specific error boundary integration
    // Note: React Router integration can be added if using React Router
  ],
  
  // Filter out sensitive data - wrapped in try-catch for safety
  beforeSend(event, hint) {
    try {
      // Don't send events in development unless explicitly enabled
      if (import.meta.env.MODE === "development" && !import.meta.env.VITE_SENTRY_DSN) {
        return null;
      }
      
      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors that are expected
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          return null;
        }
        // Ignore ResizeObserver errors (browser quirk)
        if (error.message.includes("ResizeObserver")) {
          return null;
        }
      }
      
      // Remove sensitive data from request
      if (event.request) {
        // Remove auth headers
        if (event.request.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
          delete event.request.headers["x-api-key"];
        }
        // Filter sensitive query params
        if (event.request.query_string && typeof event.request.query_string === "string") {
          event.request.query_string = event.request.query_string
            .split("&")
            .filter((param: string) => {
              const key = param.split("=")[0]?.toLowerCase() || "";
              return !["token", "key", "password", "secret", "auth"].includes(key);
            })
            .join("&");
        }
      }
      
      return event;
    } catch (beforeSendError) {
      // beforeSend failed - log but return event unmodified
      console.warn("Sentry beforeSend error:", beforeSendError);
      return event;
    }
  },
  
  // Ignore certain errors that are noise
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "chrome-extension://",
    "moz-extension://",
    // Network errors
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    // Third-party scripts
    "Script error.",
    "Loading chunk",
  ],
  
  // Deny URLs from third-party scripts
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
  ],
  });
  
  sentryInitialized = true;
  console.log("✅ Sentry client initialized");
} catch (error) {
  // Don't block app startup if Sentry initialization fails
  console.warn("⚠️ Sentry client initialization failed, continuing without error tracking:", error);
  sentryInitialized = false;
}

// Export Sentry for use in error boundaries (with safety check)
export { Sentry };

/**
 * Safe wrapper for capturing exceptions
 * Use this instead of Sentry.captureException directly for guaranteed safety
 */
export function safeCaptureException(error: Error, context?: Record<string, unknown>): string | null {
  if (!isSentryAvailable()) {
    console.error("Exception (Sentry unavailable):", error.message);
    return null;
  }
  
  try {
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext("additional", context);
      }
      return Sentry.captureException(error);
    }) as string;
  } catch (sentryError) {
    console.warn("Failed to send to Sentry:", sentryError);
    return null;
  }
}

/**
 * Safe wrapper for capturing messages
 */
export function safeCaptureMessage(message: string, level: "info" | "warning" | "error" = "info"): string | null {
  if (!isSentryAvailable()) {
    console.log(`[${level.toUpperCase()}] (Sentry unavailable):`, message);
    return null;
  }
  
  try {
    return Sentry.captureMessage(message, level);
  } catch (sentryError) {
    console.warn("Failed to send message to Sentry:", sentryError);
    return null;
  }
}
