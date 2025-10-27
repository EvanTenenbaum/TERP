import { logger } from "./logger";
import { closeConnectionPool } from "./connectionPool";

type ShutdownHandler = () => Promise<void> | void;

const shutdownHandlers: ShutdownHandler[] = [];
let isShuttingDown = false;

/**
 * Register a handler to be called during graceful shutdown
 */
export function registerShutdownHandler(handler: ShutdownHandler): void {
  shutdownHandlers.push(handler);
}

/**
 * Perform graceful shutdown
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring signal");
    return;
  }

  isShuttingDown = true;

  logger.info({
    msg: "Graceful shutdown initiated",
    signal,
  });

  try {
    // Run all registered shutdown handlers
    logger.info(`Running ${shutdownHandlers.length} shutdown handlers`);

    for (const handler of shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error({
          msg: "Shutdown handler failed",
          error,
        });
      }
    }

    // Close database connection pool
    logger.info("Closing database connection pool");
    await closeConnectionPool();

    logger.info("Graceful shutdown completed");

    // Exit with success code
    process.exit(0);
  } catch (error) {
    logger.error({
      msg: "Graceful shutdown failed",
      error,
    });

    // Exit with error code
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers for common signals
 */
export function setupGracefulShutdown(): void {
  // Handle SIGTERM (e.g., from Kubernetes, Docker, systemd)
  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM signal");
    gracefulShutdown("SIGTERM");
  });

  // Handle SIGINT (e.g., Ctrl+C)
  process.on("SIGINT", () => {
    logger.info("Received SIGINT signal");
    gracefulShutdown("SIGINT");
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error({
      msg: "Uncaught exception",
      error,
    });
    gracefulShutdown("uncaughtException");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error({
      msg: "Unhandled promise rejection",
      reason,
      promise,
    });
    gracefulShutdown("unhandledRejection");
  });

  logger.info("Graceful shutdown handlers registered");
}

