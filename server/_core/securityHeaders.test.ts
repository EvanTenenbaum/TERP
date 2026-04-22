import { describe, expect, it } from "vitest";

import { getHelmetConfig } from "./securityHeaders";

describe("getHelmetConfig", () => {
  it("relaxes CSP only for development Vite runtime needs", () => {
    expect(getHelmetConfig("development")).toMatchObject({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": [
            "'self'",
            "http:",
            "https:",
            "ws:",
            "wss:",
            "http://localhost:4747",
            "http://127.0.0.1:4747",
            "ws://localhost:4747",
            "ws://127.0.0.1:4747",
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    });
  });

  it("allows Agentation localhost connections on staging builds", () => {
    expect(getHelmetConfig("production", "terp-staging")).toMatchObject({
      contentSecurityPolicy: {
        directives: {
          "connect-src": [
            "'self'",
            "http://localhost:4747",
            "http://127.0.0.1:4747",
            "ws://localhost:4747",
            "ws://127.0.0.1:4747",
          ],
        },
      },
    });
  });

  it("allows a remote Agentation endpoint on staging builds", () => {
    expect(
      getHelmetConfig(
        "production",
        "terp-staging",
        "https://agentation.example.com"
      )
    ).toMatchObject({
      contentSecurityPolicy: {
        directives: {
          "connect-src": expect.arrayContaining([
            "'self'",
            "http://localhost:4747",
            "http://127.0.0.1:4747",
            "ws://localhost:4747",
            "ws://127.0.0.1:4747",
            "https://agentation.example.com",
            "wss://agentation.example.com",
          ]),
        },
      },
    });
  });

  it("keeps default Helmet behavior outside development and staging", () => {
    expect(getHelmetConfig("production")).toBeUndefined();
    expect(getHelmetConfig("production", "terp-app")).toBeUndefined();
    expect(getHelmetConfig("test")).toBeUndefined();
  });
});
