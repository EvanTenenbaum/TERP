import * as Sentry from "@sentry/react";
import React from "react";

/**
 * Sentry Client Configuration
 * 
 * Initializes Sentry error tracking for the React client application.
 * Captures client-side errors, unhandled promise rejections, and user interactions.
 */

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
  
  integrations: [
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration({
      // Trace React Router navigation
      tracePropagationTargets: ["localhost", /^https:\/\/.*\.terp\.app/],
    }),
    
    // Session replay for debugging
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    
    // React-specific error boundary integration
    // Note: React Router integration can be added if using React Router
  ],
  
  // Filter out sensitive data
  beforeSend(event, hint) {
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
    }
    
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "chrome-extension://",
    "moz-extension://",
    // Network errors
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});

// Export Sentry for use in error boundaries
export { Sentry };
