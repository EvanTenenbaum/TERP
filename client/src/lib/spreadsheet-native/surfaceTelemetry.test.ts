import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackFallbackToClassic } from "./surfaceTelemetry";

describe("surfaceTelemetry", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("tracks fallback to classic with module and path", () => {
    trackFallbackToClassic("inventory", "/inventory");
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("[surface-fallback]"),
      expect.objectContaining({ module: "inventory", path: "/inventory" })
    );
  });
});
