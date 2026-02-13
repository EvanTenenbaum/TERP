import { describe, expect, it } from "vitest";
import {
  classifyHttpStatus,
  determineTestResult,
  detect404Indicators,
  detectErrorState,
  detectLoadingState,
  hasContentPresent,
  type ValidationResult,
} from "../../../../tests-e2e/oracles/lib/validation";

describe("validation signals", () => {
  it("detects 404 indicators", () => {
    const result = detect404Indicators("Page Not Found\n404\nGo Home");
    expect(result.passed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("detects error/loading states", () => {
    expect(detectErrorState("Something went wrong").passed).toBe(false);
    expect(detectLoadingState("Loading... please wait", "").passed).toBe(false);
  });

  it("enforces content length threshold", () => {
    expect(hasContentPresent("tiny").passed).toBe(false);
    expect(hasContentPresent("x".repeat(250)).passed).toBe(true);
  });

  it("classifies http statuses", () => {
    expect(classifyHttpStatus(200).passed).toBe(true);
    expect(classifyHttpStatus(404).passed).toBe(false);
    expect(classifyHttpStatus(null).passed).toBe(false);
  });

  it("requires all critical and one required signal", () => {
    const validation: ValidationResult = {
      passed: false,
      signals: {
        http_status_ok: true,
        no_404_page: true,
        no_error_state: true,
        no_loading_state: true,
        content_present: false,
        domain_validation: true,
      },
      failureReasons: [],
    };

    expect(determineTestResult(validation)).toBe("PASS");

    validation.signals.no_error_state = false;
    expect(determineTestResult(validation)).toBe("FAIL");
  });
});
