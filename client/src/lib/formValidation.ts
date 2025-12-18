/**
 * Form Validation Utilities
 * ARCH-004: Field-level validation error handling
 *
 * This module provides:
 * - Field error extraction from tRPC/Zod errors
 * - Integration helpers for react-hook-form
 * - Type-safe field error mapping
 */

import type { FieldErrors, FieldValues, UseFormSetError, Path } from "react-hook-form";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

/**
 * Type guard for tRPC client errors
 */
function isTRPCClientError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

/**
 * Extract field errors from a tRPC error
 * Works with Zod validation errors wrapped by tRPC
 */
export function extractFieldErrorsFromTRPC(
  error: unknown
): Record<string, string[]> | undefined {
  if (!isTRPCClientError(error)) {
    return undefined;
  }

  try {
    // tRPC wraps Zod errors in data.zodError.fieldErrors
    const data = error.data as Record<string, unknown> | undefined;

    // Check direct zodError property
    if (data?.zodError && typeof data.zodError === "object") {
      const zodError = data.zodError as { fieldErrors?: Record<string, string[]> };
      if (zodError.fieldErrors) {
        return zodError.fieldErrors;
      }
    }

    // Check shape property (alternative structure)
    const shape = error.shape as {
      data?: { zodError?: { fieldErrors?: Record<string, string[]> } };
    } | undefined;

    if (shape?.data?.zodError?.fieldErrors) {
      return shape.data.zodError.fieldErrors;
    }

    // Check cause for nested validation errors
    const cause = error.cause as { fieldErrors?: Record<string, string[]> } | undefined;
    if (cause?.fieldErrors) {
      return cause.fieldErrors;
    }
  } catch {
    // Parsing failed, no field errors available
  }

  return undefined;
}

/**
 * Apply field errors from a tRPC error to a react-hook-form instance
 *
 * @example
 * ```tsx
 * const form = useForm<CreateClientInput>();
 *
 * const onSubmit = async (data) => {
 *   try {
 *     await createClient.mutateAsync(data);
 *   } catch (error) {
 *     applyFieldErrors(error, form.setError);
 *   }
 * };
 * ```
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options?: {
    /** Prefix to add to field names (for nested forms) */
    prefix?: string;
    /** Custom field name mapping */
    fieldMap?: Record<string, string>;
  }
): boolean {
  const fieldErrors = extractFieldErrorsFromTRPC(error);

  if (!fieldErrors) {
    return false;
  }

  let appliedAny = false;
  const prefix = options?.prefix || "";
  const fieldMap = options?.fieldMap || {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      // Apply field mapping if provided
      const mappedField = fieldMap[field] || field;
      const fullFieldName = prefix ? `${prefix}.${String(mappedField)}` : String(mappedField);

      // Use type assertion for react-hook-form compatibility
      setError(fullFieldName as Path<T>, {
        type: "server",
        message: messages[0],
      });
      appliedAny = true;
    }
  }

  return appliedAny;
}

/**
 * Convert tRPC field errors to react-hook-form FieldErrors format
 *
 * @example
 * ```tsx
 * const fieldErrors = toFieldErrors<CreateClientInput>(error);
 * // { teriCode: { type: "server", message: "TERI code already exists" } }
 * ```
 */
export function toFieldErrors<T extends FieldValues>(
  error: unknown
): FieldErrors<T> | undefined {
  const fieldErrors = extractFieldErrorsFromTRPC(error);

  if (!fieldErrors) {
    return undefined;
  }

  const result: Record<string, { type: string; message: string }> = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      result[field] = {
        type: "server",
        message: messages[0],
      };
    }
  }

  return result as FieldErrors<T>;
}

/**
 * Get a single field error message from field errors
 *
 * @example
 * ```tsx
 * const { fieldErrors } = useAppMutation(createClient);
 * const teriCodeError = getFieldError(fieldErrors, "teriCode");
 * // "TERI code already exists" or undefined
 * ```
 */
export function getFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  fieldName: string
): string | undefined {
  if (!fieldErrors) return undefined;
  const errors = fieldErrors[fieldName];
  return errors && errors.length > 0 ? errors[0] : undefined;
}

/**
 * Check if field errors exist for a specific field
 */
export function hasFieldError(
  fieldErrors: Record<string, string[]> | undefined,
  fieldName: string
): boolean {
  if (!fieldErrors) return false;
  const errors = fieldErrors[fieldName];
  return Boolean(errors && errors.length > 0);
}

/**
 * Get all field error messages as a flat array
 *
 * @example
 * ```tsx
 * const allErrors = getAllFieldErrors(fieldErrors);
 * // ["TERI code already exists", "Name is required"]
 * ```
 */
export function getAllFieldErrors(
  fieldErrors: Record<string, string[]> | undefined
): string[] {
  if (!fieldErrors) return [];

  const allErrors: string[] = [];
  for (const messages of Object.values(fieldErrors)) {
    if (messages) {
      allErrors.push(...messages);
    }
  }
  return allErrors;
}

/**
 * Type guard to check if an error has field errors
 */
export function hasAnyFieldErrors(
  fieldErrors: Record<string, string[]> | undefined
): fieldErrors is Record<string, string[]> {
  if (!fieldErrors) return false;
  return Object.keys(fieldErrors).length > 0;
}
