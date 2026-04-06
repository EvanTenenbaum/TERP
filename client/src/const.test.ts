import { describe, expect, it, vi } from "vitest";

describe("APP_TITLE", () => {
  it("falls back to TERP when the env value is an unresolved placeholder", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_APP_TITLE", "%VITE_APP_TITLE%");

    const { APP_TITLE } = await import("./const");

    expect(APP_TITLE).toBe("TERP");

    vi.unstubAllEnvs();
  });
});
