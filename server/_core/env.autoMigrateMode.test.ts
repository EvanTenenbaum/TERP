import { describe, expect, it } from "vitest";
import { parseAutoMigrateMode } from "./env";

describe("parseAutoMigrateMode", () => {
  it("defaults to apply when value is missing or unknown", () => {
    expect(parseAutoMigrateMode()).toBe("apply");
    expect(parseAutoMigrateMode("")).toBe("apply");
    expect(parseAutoMigrateMode("something-else")).toBe("apply");
  });

  it("normalizes detect-only aliases", () => {
    expect(parseAutoMigrateMode("detect-only")).toBe("detect-only");
    expect(parseAutoMigrateMode("detect")).toBe("detect-only");
    expect(parseAutoMigrateMode("check")).toBe("detect-only");
    expect(parseAutoMigrateMode("dry-run")).toBe("detect-only");
  });

  it("normalizes off aliases", () => {
    expect(parseAutoMigrateMode("off")).toBe("off");
    expect(parseAutoMigrateMode("false")).toBe("off");
    expect(parseAutoMigrateMode("0")).toBe("off");
    expect(parseAutoMigrateMode("disabled")).toBe("off");
    expect(parseAutoMigrateMode("none")).toBe("off");
  });
});
