/**
 * Centralized logging utility
 * This is a basic implementation that will be enhanced in P0.4
 */

interface LogContext {
  [key: string]: any;
}

class Logger {
  info(message: string, context?: LogContext) {
    console.log(`[INFO] ${message}`, context || "");
  }

  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, context || "");
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context || "");
  }

  debug(message: string, context?: LogContext) {
    console.debug(`[DEBUG] ${message}`, context || "");
  }
}

export const logger = new Logger();

