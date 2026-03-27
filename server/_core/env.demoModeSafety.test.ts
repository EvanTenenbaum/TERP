import { describe, expect, it } from "vitest";
import { isStagingAppId, shouldBlockDemoModeInProduction } from "./env";

describe("demo mode production safety", () => {
  it("recognizes the explicit staging app id", () => {
    expect(isStagingAppId("terp-staging")).toBe(true);
    expect(isStagingAppId("TERP-STAGING")).toBe(true);
    expect(isStagingAppId("terp-app")).toBe(false);
    expect(isStagingAppId(undefined)).toBe(false);
  });

  it("allows production demo mode on the staging app only", () => {
    expect(
      shouldBlockDemoModeInProduction({
        demoMode: "true",
        nodeEnv: "production",
        appId: "terp-staging",
      })
    ).toBe(false);

    expect(
      shouldBlockDemoModeInProduction({
        demoMode: "true",
        nodeEnv: "production",
        appId: "terp-app",
      })
    ).toBe(true);

    expect(
      shouldBlockDemoModeInProduction({
        demoMode: "false",
        nodeEnv: "production",
        appId: "terp-app",
      })
    ).toBe(false);

    expect(
      shouldBlockDemoModeInProduction({
        demoMode: "true",
        nodeEnv: "development",
        appId: "terp-app",
      })
    ).toBe(false);
  });
});
