/**
 * Sentry Server Configuration
 *
 * DEPRECATED: This file is kept for backwards compatibility.
 * The actual Sentry initialization is now handled in server/_core/monitoring.ts
 * which provides defensive, non-blocking error handling.
 *
 * To use Sentry:
 * - Call initMonitoring() from server/_core/monitoring.ts during server startup
 * - Use captureException() for error reporting
 * - Use setupErrorHandler(app) after routes are defined
 */

// Re-export from the central monitoring module for backwards compatibility
export {
  initMonitoring,
  captureException,
  captureMessage,
  setupErrorHandler,
} from "./server/_core/monitoring";

// Note: The Sentry object is no longer directly exported.
// Use captureException() and captureMessage() instead for safer error handling.
