import { describe, expect, it } from "vitest";
import { classifyDiskUsage, parseDfDiskUsageOutput } from "./diskHealth";

describe("diskHealth", () => {
  it("treats high percent on a roomy filesystem as ok", () => {
    expect(
      parseDfDiskUsageOutput(
        "Filesystem     1M-blocks  Used Available Use% Mounted on\noverlay              4096M 3456M      640M  84% /\n"
      )
    ).toEqual({
      status: "ok",
      totalMb: 4096,
      usedMb: 3456,
      availableMb: 640,
      usedPercent: 84,
    });
  });

  it("warns when remaining disk space gets tight", () => {
    expect(classifyDiskUsage({ usedPercent: 84, availableMb: 320 })).toBe(
      "warning"
    );
  });

  it("marks critical when disk space is nearly exhausted", () => {
    expect(
      parseDfDiskUsageOutput(
        "Filesystem     1M-blocks  Used Available Use% Mounted on\noverlay              4096M 3890M      206M  95% /\n"
      )
    ).toEqual({
      status: "critical",
      totalMb: 4096,
      usedMb: 3890,
      availableMb: 206,
      usedPercent: 95,
    });
  });

  it("returns null for malformed df output", () => {
    expect(parseDfDiskUsageOutput("Filesystem\nbroken")).toBeNull();
  });
});
