/**
 * Tests for useValidationTiming Hook
 * UXS-104: Tests "Reward Early, Punish Late" validation pattern
 *
 * Validation Timing (from ATOMIC_UX_STRATEGY.md):
 * - NEVER show required-field errors while typing
 * - ALWAYS validate on blur and commit
 * - Server validates everything regardless of client validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useValidationTiming } from "../useValidationTiming";

// Test schemas
const simpleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
});

const complexSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(0, "Age must be positive").max(150, "Invalid age"),
  website: z.string().url("Invalid URL").optional(),
});

describe("useValidationTiming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty values and pristine field states", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      expect(result.current.values).toEqual({});
      expect(result.current.validationState.isValid).toBe(true);
      expect(result.current.validationState.errors).toEqual({});
    });

    it("should initialize with provided initial values", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "John", email: "john@example.com" },
        })
      );

      expect(result.current.values).toEqual({
        name: "John",
        email: "john@example.com",
      });
    });

    it("should expose all required functions", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      expect(typeof result.current.getFieldState).toBe("function");
      expect(typeof result.current.handleChange).toBe("function");
      expect(typeof result.current.handleBlur).toBe("function");
      expect(typeof result.current.validateAll).toBe("function");
      expect(typeof result.current.reset).toBe("function");
      expect(typeof result.current.setValues).toBe("function");
      expect(typeof result.current.isFieldValid).toBe("function");
    });
  });

  describe("getFieldState", () => {
    it("should return pristine state for untouched fields", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      const fieldState = result.current.getFieldState("name");

      expect(fieldState).toEqual({
        status: "pristine",
        showSuccess: false,
        showError: false,
        touched: false,
      });
    });
  });

  describe("handleChange - No errors while typing", () => {
    it("should update value when field changes", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("name", "John");
      });

      expect(result.current.values.name).toBe("John");
    });

    it("should set field to typing state without showing errors", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("email", "invalid"); // Invalid email format
      });

      const fieldState = result.current.getFieldState("email");

      expect(fieldState.status).toBe("typing");
      expect(fieldState.showError).toBe(false); // NO ERRORS WHILE TYPING
      expect(fieldState.touched).toBe(true);
    });

    it("should NOT show errors for empty required field while typing", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      // User starts typing then deletes
      act(() => {
        result.current.handleChange("name", "J");
      });

      act(() => {
        result.current.handleChange("name", "");
      });

      const fieldState = result.current.getFieldState("name");

      expect(fieldState.showError).toBe(false); // Never show errors while typing
    });
  });

  describe("handleBlur - Validation on blur", () => {
    it("should validate and show error on blur for invalid field", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("email", "invalid-email");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      const fieldState = result.current.getFieldState("email");

      expect(fieldState.status).toBe("invalid");
      expect(fieldState.showError).toBe(true);
      expect(fieldState.error).toBe("Invalid email format");
    });

    it("should show success for valid field on blur", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("email", "valid@example.com");
      });

      act(() => {
        result.current.handleBlur("email");
      });

      const fieldState = result.current.getFieldState("email");

      expect(fieldState.status).toBe("valid");
      expect(fieldState.showSuccess).toBe(true);
      expect(fieldState.showError).toBe(false);
    });

    it("should show error for empty required field on blur", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("name", "");
      });

      act(() => {
        result.current.handleBlur("name");
      });

      const fieldState = result.current.getFieldState("name");

      expect(fieldState.status).toBe("invalid");
      expect(fieldState.showError).toBe(true);
      expect(fieldState.error).toBe("Name is required");
    });
  });

  describe("validateAll - Form submission validation", () => {
    it("should return valid for completely valid form", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "John", email: "john@example.com" },
        })
      );

      let validationResult: { isValid: boolean; errors: Record<string, string> };

      act(() => {
        validationResult = result.current.validateAll();
      });

      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.errors).toEqual({});
    });

    it("should return all errors for invalid form", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "", email: "invalid" },
        })
      );

      let validationResult: { isValid: boolean; errors: Record<string, string> };

      act(() => {
        validationResult = result.current.validateAll();
      });

      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errors).toHaveProperty("name");
      expect(validationResult!.errors).toHaveProperty("email");
    });

    it("should update all field states to show errors", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "", email: "invalid" },
        })
      );

      act(() => {
        result.current.validateAll();
      });

      const nameState = result.current.getFieldState("name");
      const emailState = result.current.getFieldState("email");

      expect(nameState.showError).toBe(true);
      expect(emailState.showError).toBe(true);
    });

    it("should call onValidationChange callback", () => {
      const onValidationChange = vi.fn();
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "", email: "invalid" },
          onValidationChange,
        })
      );

      act(() => {
        result.current.validateAll();
      });

      expect(onValidationChange).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          name: expect.any(String),
          email: expect.any(String),
        })
      );
    });
  });

  describe("immediateValidationFields", () => {
    it("should show success after debounce for immediate validation fields", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          immediateValidationFields: ["email"],
          typingDebounce: 300,
        })
      );

      act(() => {
        result.current.handleChange("email", "valid@example.com");
      });

      // Before debounce - should be typing with no success
      let fieldState = result.current.getFieldState("email");
      expect(fieldState.status).toBe("typing");
      expect(fieldState.showSuccess).toBe(false);

      // After debounce - should show success for valid value
      act(() => {
        vi.advanceTimersByTime(300);
      });

      fieldState = result.current.getFieldState("email");
      expect(fieldState.status).toBe("valid");
      expect(fieldState.showSuccess).toBe(true);
    });

    it("should NOT show errors during typing even for immediate validation", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          immediateValidationFields: ["email"],
          typingDebounce: 300,
        })
      );

      act(() => {
        result.current.handleChange("email", "invalid");
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should NOT show error - only show success indicators while typing
      const fieldState = result.current.getFieldState("email");
      expect(fieldState.showError).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all field states", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "John" },
        })
      );

      // Make some changes
      act(() => {
        result.current.handleChange("name", "Jane");
        result.current.handleChange("email", "jane@example.com");
      });

      // Blur to trigger validation
      act(() => {
        result.current.handleBlur("email");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual({ name: "John" });
      expect(result.current.getFieldState("email")).toEqual({
        status: "pristine",
        showSuccess: false,
        showError: false,
        touched: false,
      });
    });

    it("should clear typing timeouts", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          immediateValidationFields: ["email"],
          typingDebounce: 300,
        })
      );

      act(() => {
        result.current.handleChange("email", "test@example.com");
      });

      // Reset before timeout fires
      act(() => {
        result.current.reset();
      });

      // Advance timers - should not cause state change
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.getFieldState("email").status).toBe("pristine");
    });
  });

  describe("setValues", () => {
    it("should allow programmatic value setting", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.setValues({
          name: "Programmatic",
          email: "prog@example.com",
        });
      });

      expect(result.current.values).toEqual({
        name: "Programmatic",
        email: "prog@example.com",
      });
    });
  });

  describe("isFieldValid", () => {
    it("should return false for invalid field", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("email", "invalid");
        result.current.handleBlur("email");
      });

      expect(result.current.isFieldValid("email")).toBe(false);
    });

    it("should return true for valid field", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      act(() => {
        result.current.handleChange("email", "valid@example.com");
        result.current.handleBlur("email");
      });

      expect(result.current.isFieldValid("email")).toBe(true);
    });

    it("should return false for pristine (untouched) field", () => {
      const { result } = renderHook(() =>
        useValidationTiming({ schema: simpleSchema })
      );

      // Pristine field - status is not "valid"
      expect(result.current.isFieldValid("email")).toBe(false);
    });
  });

  describe("validationState", () => {
    it("should compute overall validation state correctly", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "John", email: "john@example.com" },
        })
      );

      // Trigger validation
      act(() => {
        result.current.handleBlur("name");
        result.current.handleBlur("email");
      });

      expect(result.current.validationState.isValid).toBe(true);
      expect(result.current.validationState.errors).toEqual({});
    });

    it("should include all errors in validation state", () => {
      const { result } = renderHook(() =>
        useValidationTiming({
          schema: simpleSchema,
          initialValues: { name: "", email: "invalid" },
        })
      );

      act(() => {
        result.current.validateAll();
      });

      expect(result.current.validationState.isValid).toBe(false);
      expect(Object.keys(result.current.validationState.errors).length).toBe(2);
    });
  });
});

describe("complex validation scenarios", () => {
  it("should handle multi-field form correctly", () => {
    const { result } = renderHook(() =>
      useValidationTiming({
        schema: complexSchema,
        initialValues: {},
      })
    );

    // Fill in valid data
    act(() => {
      result.current.handleChange("name", "John Doe");
      result.current.handleChange("email", "john@example.com");
      result.current.handleChange("age", 30);
    });

    let validationResult: { isValid: boolean; errors: Record<string, string> };

    act(() => {
      validationResult = result.current.validateAll();
    });

    expect(validationResult!.isValid).toBe(true);
  });

  it("should handle optional fields correctly", () => {
    const { result } = renderHook(() =>
      useValidationTiming({
        schema: complexSchema,
        initialValues: {
          name: "John",
          email: "john@example.com",
          age: 30,
          // website is optional - not provided
        },
      })
    );

    let validationResult: { isValid: boolean; errors: Record<string, string> };

    act(() => {
      validationResult = result.current.validateAll();
    });

    expect(validationResult!.isValid).toBe(true);
  });

  it("should validate optional field when provided", () => {
    const { result } = renderHook(() =>
      useValidationTiming({
        schema: complexSchema,
        initialValues: {
          name: "John",
          email: "john@example.com",
          age: 30,
          website: "not-a-url", // Invalid URL
        },
      })
    );

    let validationResult: { isValid: boolean; errors: Record<string, string> };

    act(() => {
      validationResult = result.current.validateAll();
    });

    expect(validationResult!.isValid).toBe(false);
    expect(validationResult!.errors.website).toBe("Invalid URL");
  });
});

describe("user interaction flow - Reward Early, Punish Late", () => {
  it("should follow the correct pattern: type (no errors) -> blur (show errors) -> fix (show success)", () => {
    const { result } = renderHook(() =>
      useValidationTiming({ schema: simpleSchema })
    );

    // Step 1: User types invalid email - NO ERRORS
    act(() => {
      result.current.handleChange("email", "invalid");
    });

    let fieldState = result.current.getFieldState("email");
    expect(fieldState.showError).toBe(false);
    expect(fieldState.status).toBe("typing");

    // Step 2: User blurs - SHOW ERROR
    act(() => {
      result.current.handleBlur("email");
    });

    fieldState = result.current.getFieldState("email");
    expect(fieldState.showError).toBe(true);
    expect(fieldState.error).toBe("Invalid email format");

    // Step 3: User starts fixing - back to typing, no error shown
    act(() => {
      result.current.handleChange("email", "valid@");
    });

    fieldState = result.current.getFieldState("email");
    expect(fieldState.showError).toBe(false);
    expect(fieldState.status).toBe("typing");

    // Step 4: User finishes and blurs - SHOW SUCCESS
    act(() => {
      result.current.handleChange("email", "valid@example.com");
    });

    act(() => {
      result.current.handleBlur("email");
    });

    fieldState = result.current.getFieldState("email");
    expect(fieldState.showSuccess).toBe(true);
    expect(fieldState.showError).toBe(false);
    expect(fieldState.status).toBe("valid");
  });
});
