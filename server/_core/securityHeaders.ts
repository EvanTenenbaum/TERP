import helmet, { type HelmetOptions } from "helmet";

import { isStagingAppId } from "./env";

const AGENTATION_CONNECT_SOURCES = [
  "http://localhost:4747",
  "http://127.0.0.1:4747",
  "ws://localhost:4747",
  "ws://127.0.0.1:4747",
];

/**
 * Vite injects a small inline preamble in development for React refresh/HMR.
 * Production builds serve static assets and should keep the stricter default.
 */
export function getHelmetConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  appId: string | undefined = process.env.VITE_APP_ID
): HelmetOptions | undefined {
  if (nodeEnv === "development") {
    return {
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": [
            "'self'",
            "http:",
            "https:",
            "ws:",
            "wss:",
            ...AGENTATION_CONNECT_SOURCES,
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    };
  }

  if (!isStagingAppId(appId)) {
    return undefined;
  }

  return {
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "connect-src": ["'self'", ...AGENTATION_CONNECT_SOURCES],
      },
    },
  };
}
