/**
 * useValidationTiming - "Reward Early, Punish Late" validation implementation
 * UXS-104: Implements the validation timing pattern for Work Surfaces
 *
 * Validation Timing (from ATOMIC_UX_STRATEGY.md):
 * - NEVER show required-field errors while typing
 * - ALWAYS validate on blur and commit
 * - Server validates everything regardless of client validation
 *
 * Pattern:
 * ```
 * User types → No errors shown (success indicators OK)
 * User blurs field → Validation runs, errors appear
 * User commits row → Final validation, errors block commit
 * ```
 *
 * Usage:
 * ```tsx
 * const { getFieldState, handleChange, handleBlur, validateAll } = useValidationTiming({
 *   schema: itemSchema, // Zod schema
 *   onValidationChange: (isValid) => setCanSubmit(isValid),
 * });
 *
 * return (
 *   <Input
 *     value={values.name}
 *     onChange={(e) => handleChange("name", e.target.value)}
 *     onBlur={() => handleBlur("name")}
 *     {...getFieldState("name")} // Adds error/success states
 *   />
 * );
 * ```
 *
 * @see ATOMIC_UX_STRATEGY.md Section 5.4 - Validation Timing
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export type FieldStatus = "pristine" | "typing" | "valid" | "invalid";

export interface FieldState {
  status: FieldStatus;
  error?: string;
  /** Show success indicator (green checkmark) */
  showSuccess: boolean;
  /** Show error indicator (red warning) */
  showError: boolean;
  /** Touched = user has interacted with field */
  touched: boolean;
}

export interface ValidationState {
  fields: Record<string, FieldState>;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface UseValidationTimingOptions<T extends z.ZodType> {
  /** Zod schema for validation */
  schema: T;
  /** Initial values */
  initialValues?: Partial<z.infer<T>>;
  /** Called when overall validation state changes */
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  /** Debounce delay for typing indicator (ms) */
  typingDebounce?: number;
  /** Fields to validate immediately on change (e.g., format validators) */
  immediateValidationFields?: string[];
}

export interface UseValidationTimingReturn<T extends z.ZodType> {
  /** Get field state for rendering */
  getFieldState: (field: keyof z.infer<T>) => FieldState;
  /** Handle field value change (no errors shown) */
  handleChange: (field: keyof z.infer<T>, value: unknown) => void;
  /** Handle field blur (triggers validation) */
  handleBlur: (field: keyof z.infer<T>) => void;
  /** Validate all fields (for form submit) */
  validateAll: () => { isValid: boolean; errors: Record<string, string> };
  /** Reset validation state */
  reset: () => void;
  /** Current values */
  values: Partial<z.infer<T>>;
  /** Set values programmatically */
  setValues: (values: Partial<z.infer<T>>) => void;
  /** Overall validation state */
  validationState: ValidationState;
  /** Check if a specific field is valid */
  isFieldValid: (field: keyof z.infer<T>) => boolean;
}

// ============================================================================
// DEFAULT FIELD STATE
// ============================================================================

const defaultFieldState: FieldState = {
  status: "pristine",
  showSuccess: false,
  showError: false,
  touched: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useValidationTiming<T extends z.ZodType>({
  schema,
  initialValues = {},
  onValidationChange,
  typingDebounce = 300,
  immediateValidationFields = [],
}: UseValidationTimingOptions<T>): UseValidationTimingReturn<T> {
  type FormValues = Partial<z.infer<T>>;

  // Values state
  const [values, setValues] = useState<FormValues>(initialValues);

  // Ref to track latest values (for use in handleBlur before state flushes)
  const valuesRef = useRef<FormValues>(initialValues);

  // Field states
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});

  // Typing timeout refs
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // ============================================================================
  // Validate a single field against schema
  // ============================================================================
  const validateField = useCallback(
    (field: string, value: unknown): { isValid: boolean; error?: string } => {
      try {
        // Try to validate just this field by creating a partial schema
        // This is a simplified approach - in production, use schema.pick() or similar
        const result = schema.safeParse({ ...values, [field]: value });

        if (result.success) {
          return { isValid: true };
        }

        // Find error for this specific field
        const fieldError = result.error.issues.find(
          (issue) => issue.path[0] === field
        );

        if (fieldError) {
          return { isValid: false, error: fieldError.message };
        }

        return { isValid: true };
      } catch {
        return { isValid: true }; // Fail open on validation errors
      }
    },
    [schema, values]
  );

  // ============================================================================
  // Handle field change - NO ERRORS, only success indicators
  // ============================================================================
  const handleChange = useCallback(
    (field: keyof z.infer<T>, value: unknown) => {
      const fieldKey = String(field);

      // Update value (both state and ref for immediate access)
      const newValues = { ...valuesRef.current, [fieldKey]: value };
      valuesRef.current = newValues;
      setValues(newValues);

      // Clear any existing typing timeout
      if (typingTimeouts.current[fieldKey]) {
        clearTimeout(typingTimeouts.current[fieldKey]);
      }

      // Set typing state (no errors shown)
      setFieldStates((prev) => ({
        ...prev,
        [fieldKey]: {
          ...defaultFieldState,
          status: "typing",
          touched: true,
          showSuccess: false,
          showError: false, // NEVER show errors while typing
        },
      }));

      // For immediate validation fields, validate after debounce
      if (immediateValidationFields.includes(fieldKey)) {
        typingTimeouts.current[fieldKey] = setTimeout(() => {
          const { isValid } = validateField(fieldKey, value);
          if (isValid) {
            setFieldStates((prev) => ({
              ...prev,
              [fieldKey]: {
                ...prev[fieldKey],
                status: "valid",
                showSuccess: true, // Show success indicator
              },
            }));
          }
        }, typingDebounce);
      }
    },
    [immediateValidationFields, typingDebounce, validateField]
  );

  // ============================================================================
  // Handle field blur - TRIGGER VALIDATION, show errors
  // ============================================================================
  const handleBlur = useCallback(
    (field: keyof z.infer<T>) => {
      const fieldKey = String(field);
      // Use ref for immediate access to latest value (state may not have flushed yet)
      const value = valuesRef.current[field as keyof FormValues];

      // Clear typing timeout
      if (typingTimeouts.current[fieldKey]) {
        clearTimeout(typingTimeouts.current[fieldKey]);
      }

      // Validate on blur
      const { isValid, error } = validateField(fieldKey, value);

      setFieldStates((prev) => ({
        ...prev,
        [fieldKey]: {
          status: isValid ? "valid" : "invalid",
          error: isValid ? undefined : error,
          showSuccess: isValid,
          showError: !isValid, // Show error on blur
          touched: true,
        },
      }));
    },
    [values, validateField]
  );

  // ============================================================================
  // Validate all fields - for form submit
  // ============================================================================
  const validateAll = useCallback((): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const result = schema.safeParse(values);

    if (result.success) {
      // All valid - update all field states
      const newStates: Record<string, FieldState> = {};
      Object.keys(values).forEach((key) => {
        newStates[key] = {
          status: "valid",
          showSuccess: true,
          showError: false,
          touched: true,
        };
      });
      setFieldStates(newStates);

      onValidationChange?.(true, {});
      return { isValid: true, errors: {} };
    }

    // Has errors - update field states with errors
    const errors: Record<string, string> = {};
    const newStates: Record<string, FieldState> = { ...fieldStates };

    result.error.issues.forEach((issue) => {
      const field = String(issue.path[0]);
      errors[field] = issue.message;
      newStates[field] = {
        status: "invalid",
        error: issue.message,
        showSuccess: false,
        showError: true,
        touched: true,
      };
    });

    // Mark valid fields
    Object.keys(values).forEach((key) => {
      if (!errors[key]) {
        newStates[key] = {
          status: "valid",
          showSuccess: true,
          showError: false,
          touched: true,
        };
      }
    });

    setFieldStates(newStates);
    onValidationChange?.(false, errors);
    return { isValid: false, errors };
  }, [schema, values, fieldStates, onValidationChange]);

  // ============================================================================
  // Get field state for rendering
  // ============================================================================
  const getFieldState = useCallback(
    (field: keyof z.infer<T>): FieldState => {
      return fieldStates[String(field)] || defaultFieldState;
    },
    [fieldStates]
  );

  // ============================================================================
  // Check if field is valid
  // ============================================================================
  const isFieldValid = useCallback(
    (field: keyof z.infer<T>): boolean => {
      const state = fieldStates[String(field)];
      return state?.status === "valid";
    },
    [fieldStates]
  );

  // ============================================================================
  // Programmatic value setting (keeps ref in sync)
  // ============================================================================
  const setValuesWithRef = useCallback((newValues: FormValues) => {
    valuesRef.current = newValues;
    setValues(newValues);
  }, []);

  // ============================================================================
  // Reset validation state
  // ============================================================================
  const reset = useCallback(() => {
    setFieldStates({});
    valuesRef.current = initialValues;
    setValues(initialValues);
    Object.values(typingTimeouts.current).forEach(clearTimeout);
    typingTimeouts.current = {};
  }, [initialValues]);

  // ============================================================================
  // Computed validation state
  // ============================================================================
  const validationState = useMemo((): ValidationState => {
    const errors: Record<string, string> = {};
    let isValid = true;

    Object.entries(fieldStates).forEach(([key, state]) => {
      if (state.status === "invalid" && state.error) {
        errors[key] = state.error;
        isValid = false;
      }
    });

    return {
      fields: fieldStates,
      isValid,
      errors,
    };
  }, [fieldStates]);

  return {
    getFieldState,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    values,
    setValues: setValuesWithRef,
    validationState,
    isFieldValid,
  };
}

export default useValidationTiming;
