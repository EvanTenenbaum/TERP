import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { handleGitHubWebhook } from "./github";
import { getDb } from "../db";
import { logger } from "../_core/logger";

function createResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));

  return {
    response: { status, json } as unknown as Response,
    status,
    json,
  };
}

function createRequest(
  headers: Record<string, string> = {},
  body: unknown = {}
) {
  return {
    headers,
    body,
  } as Request;
}

describe("handleGitHubWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(null);
    delete process.env.WEBHOOK_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("acknowledges webhook deliveries when the secret is not configured", async () => {
    const req = createRequest();
    const { response, status, json } = createResponse();

    await handleGitHubWebhook(req, response);

    expect(status).toHaveBeenCalledWith(202);
    expect(json).toHaveBeenCalledWith({
      message: "Webhook ignored; secret not configured",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "[WEBHOOK] WEBHOOK_SECRET not configured; skipping GitHub webhook processing"
    );
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed signatures instead of throwing a 500", async () => {
    process.env.WEBHOOK_SECRET = "topsecret";
    const req = createRequest(
      {
        "x-hub-signature-256": "sha256=bad",
        "x-github-event": "push",
      },
      { hello: "world" }
    );
    const { response, status, json } = createResponse();

    await handleGitHubWebhook(req, response);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Invalid signature" });
    expect(getDb).not.toHaveBeenCalled();
  });
});
