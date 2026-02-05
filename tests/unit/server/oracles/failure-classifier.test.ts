import { describe, expect, it } from "vitest";
import {
  FailureMode,
  classifyFailure,
} from "../../../../tests-e2e/oracles/lib/failure-classifier";
import type { ValidationResult } from "../../../../tests-e2e/oracles/lib/validation";

function makeValidation(
  overrides?: Partial<ValidationResult["signals"]>
): ValidationResult {
  return {
    passed: false,
    signals: {
      http_status_ok: true,
      no_404_page: true,
      no_error_state: true,
      no_loading_state: true,
      content_present: true,
      domain_validation: true,
      ...overrides,
    },
    failureReasons: [],
  };
}

describe("failure classification", () => {
  it("classifies response status failures", () => {
    expect(classifyFailure(404, makeValidation(), null)).toBe(
      FailureMode.HTTP_404
    );
    expect(classifyFailure(500, makeValidation(), null)).toBe(
      FailureMode.HTTP_500
    );
  });

  it("classifies validation failures", () => {
    expect(
      classifyFailure(200, makeValidation({ no_404_page: false }), null)
    ).toBe(FailureMode.PAGE_NOT_FOUND);
    expect(
      classifyFailure(200, makeValidation({ content_present: false }), null)
    ).toBe(FailureMode.INSUFFICIENT_CONTENT);
  });

  it("classifies timeout and network errors", () => {
    expect(
      classifyFailure(200, makeValidation(), new Error("Timeout while loading"))
    ).toBe(FailureMode.TIMEOUT);

    expect(
      classifyFailure(
        200,
        makeValidation(),
        new Error("net::ERR_CONNECTION_REFUSED")
      )
    ).toBe(FailureMode.NETWORK_ERROR);
  });
});
