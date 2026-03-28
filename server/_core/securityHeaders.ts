import type { HelmetOptions } from "helmet";

/**
 * Vite injects a small inline preamble in development for React refresh/HMR.
 * Production builds serve static assets and should keep the stricter default.
 */
export function getHelmetConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV
): HelmetOptions | undefined {
  if (nodeEnv !== "development") {
    return undefined;
  }

  return {
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": ["'self'", "http:", "https:", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  };
}
