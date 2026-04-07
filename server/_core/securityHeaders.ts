import helmet, { type HelmetOptions } from "helmet";

import { isStagingAppId } from "./env";

const LOCAL_AGENTATION_CONNECT_SOURCES = [
  "http://localhost:4747",
  "http://127.0.0.1:4747",
  "ws://localhost:4747",
  "ws://127.0.0.1:4747",
];

function getAgentationConnectSources(
  endpoint: string | undefined = process.env.VITE_AGENTATION_ENDPOINT
) {
  const sources = new Set(LOCAL_AGENTATION_CONNECT_SOURCES);

  if (!endpoint) {
    return Array.from(sources);
  }

  try {
    const url = new URL(endpoint);
    sources.add(url.origin);

    if (url.protocol === "https:") {
      sources.add(`wss://${url.host}`);
    } else if (url.protocol === "http:") {
      sources.add(`ws://${url.host}`);
    }
  } catch {
    // Ignore malformed overrides and keep the safe localhost defaults.
  }

  return Array.from(sources);
}

/**
 * Vite injects a small inline preamble in development for React refresh/HMR.
 * Production builds serve static assets and should keep the stricter default.
 */
export function getHelmetConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  appId: string | undefined = process.env.VITE_APP_ID,
  agentationEndpoint: string | undefined = process.env.VITE_AGENTATION_ENDPOINT
): HelmetOptions | undefined {
  const agentationConnectSources =
    getAgentationConnectSources(agentationEndpoint);

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
            ...agentationConnectSources,
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
        "connect-src": ["'self'", ...agentationConnectSources],
      },
    },
  };
}
