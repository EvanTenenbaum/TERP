import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Replace console methods with logger
 * Call this in server startup
 */
export function replaceConsole() {
  console.log = (...args: any[]) => logger.info(args);
  console.error = (...args: any[]) => logger.error(args);
  console.warn = (...args: any[]) => logger.warn(args);
  console.debug = (...args: any[]) => logger.debug(args);
}

