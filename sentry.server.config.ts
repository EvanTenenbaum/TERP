import * as Sentry from "@sentry/node";
import { Handlers } from "@sentry/node";

/**
 * Sentry Server Configuration
 * 
 * Initializes Sentry error tracking for the Node.js server application.
 * Captures server-side errors, API errors, and performance metrics.
 */

Sentry.init({
  // DSN from environment variable - set in production
  dsn: process.env.SENTRY_DSN || "",
  
  // Environment name (development, staging, production)
  environment: process.env.NODE_ENV || "development",
  
  // Enable Sentry only in production or when DSN is explicitly set
  enabled: !!process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
  
  integrations: [
    // Automatically instrument Node.js modules
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    
    // Capture console logs as breadcrumbs
    Sentry.captureConsoleIntegration({
      levels: ["error", "warn"],
    }),
  ],
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DSN) {
      return null;
    }
    
    // Remove sensitive data from request
    if (event.request) {
      // Remove authorization headers
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      
      // Remove sensitive query parameters
      if (event.request.query_string) {
        const sanitized = event.request.query_string
          .split("&")
          .filter((param) => !param.startsWith("token=") && !param.startsWith("key="))
          .join("&");
        event.request.query_string = sanitized;
      }
    }
    
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    "ECONNRESET",
    "ENOTFOUND",
    "ETIMEDOUT",
    "socket hang up",
  ],
});

/**
 * Express error handler middleware
 * Use this in your Express app to automatically capture errors
 * 
 * Example:
 * app.use(Sentry.Handlers.errorHandler());
 */
export const sentryErrorHandler = Handlers.errorHandler();

/**
 * Express request handler middleware
 * Use this at the beginning of your Express app to capture request data
 * 
 * Example:
 * app.use(Sentry.Handlers.requestHandler());
 */
export const sentryRequestHandler = Handlers.requestHandler();

// Export Sentry for manual error capturing
export { Sentry };
