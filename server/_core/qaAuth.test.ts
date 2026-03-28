import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isQaAuthEnabled, registerQaAuthRoutes } from "./qaAuth";

function restoreEnv(
  original: Partial<
    Record<"NODE_ENV" | "QA_AUTH_ENABLED" | "DEMO_MODE", string | undefined>
  >
) {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function withQaAuthServer(
  run: (baseUrl: string) => Promise<void>,
  port = 0
) {
  const app = express();
  app.use(express.json());
  registerQaAuthRoutes(app);

  const server = await new Promise<import("http").Server>(resolve => {
    const instance = app.listen(port, () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe("isQaAuthEnabled", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    QA_AUTH_ENABLED: process.env.QA_AUTH_ENABLED,
    DEMO_MODE: process.env.DEMO_MODE,
  };

  afterEach(() => {
    restoreEnv(originalEnv);
    vi.restoreAllMocks();
  });

  it("disables QA auth in production even when QA_AUTH_ENABLED is true", () => {
    process.env.NODE_ENV = "production";
    process.env.QA_AUTH_ENABLED = "true";
    delete process.env.DEMO_MODE;

    expect(isQaAuthEnabled()).toBe(false);
  });

  it("allows DEMO_MODE to explicitly enable QA auth in production", () => {
    process.env.NODE_ENV = "production";
    process.env.QA_AUTH_ENABLED = "false";
    process.env.DEMO_MODE = "true";

    expect(isQaAuthEnabled()).toBe(true);
  });
});

describe("registerQaAuthRoutes", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    QA_AUTH_ENABLED: process.env.QA_AUTH_ENABLED,
    DEMO_MODE: process.env.DEMO_MODE,
  };

  afterEach(() => {
    restoreEnv(originalEnv);
    vi.restoreAllMocks();
  });

  it("rejects QA login in production when only QA_AUTH_ENABLED is set", async () => {
    process.env.NODE_ENV = "production";
    process.env.QA_AUTH_ENABLED = "true";
    delete process.env.DEMO_MODE;

    await withQaAuthServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/qa-auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "qa.superadmin@terp.test",
          password: "TerpQA2026!",
        }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: "QA authentication is not enabled",
      });
    });
  });

  it("reports QA auth enabled in production only when DEMO_MODE is on", async () => {
    process.env.NODE_ENV = "production";
    process.env.QA_AUTH_ENABLED = "false";
    process.env.DEMO_MODE = "true";

    await withQaAuthServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/qa-auth/status`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        enabled: true,
        environment: "production",
      });
    });
  });
});
