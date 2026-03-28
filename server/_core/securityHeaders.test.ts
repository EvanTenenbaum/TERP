import { describe, expect, it } from "vitest";

import { getHelmetConfig } from "./securityHeaders";

describe("getHelmetConfig", () => {
  it("relaxes CSP only for development Vite runtime needs", () => {
    expect(getHelmetConfig("development")).toMatchObject({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": ["'self'", "http:", "https:", "ws:", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    });
  });

  it("keeps default Helmet behavior outside development", () => {
    expect(getHelmetConfig("production")).toBeUndefined();
    expect(getHelmetConfig("test")).toBeUndefined();
  });
});
