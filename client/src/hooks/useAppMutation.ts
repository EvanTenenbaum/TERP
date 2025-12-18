/**
 * useAppMutation - Standardized tRPC mutation wrapper
 * ARCH-001: Global error handling for mutations
 * ARCH-002: Loading state and double-submit prevention
 *
 * This hook provides:
 * - Automatic error toasts with user-friendly messages
 * - Success toast notifications (optional)
 * - Field-level error extraction for forms
 * - Consistent loading state management
 * - Double-submit prevention
 */

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  normalizeError,
  getErrorMessage,
  extractFieldErrors,
  logError,
  type AppErrorInfo,
} from "@/lib/errorHandling";

/**
 * Options for useAppMutation
 */
export interface UseAppMutationOptions<TData, TError, TVariables> {
  /** Success callback */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Error callback - called after toast is shown */
  onError?: (error: AppErrorInfo, variables: TVariables) => void;
  /** Settled callback - called after success or error */
  onSettled?: (data: TData | undefined, error: AppErrorInfo | undefined, variables: TVariables) => void;
  /** Custom success message - if provided, shows a success toast */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  /** Custom error message - overrides the automatic message */
  errorMessage?: string | ((error: unknown) => string);
  /** Disable automatic error toast */
  disableErrorToast?: boolean;
  /** Context for error logging */
  context?: Record<string, unknown>;
}

/**
 * Result from useAppMutation
 */
export interface UseAppMutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => void;
  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Whether the mutation is currently pending */
  isPending: boolean;
  /** Whether the mutation has succeeded */
  isSuccess: boolean;
  /** Whether the mutation has failed */
  isError: boolean;
  /** The error if mutation failed */
  error: AppErrorInfo | null;
  /** Field-level errors for form validation */
  fieldErrors: Record<string, string[]> | undefined;
  /** The data if mutation succeeded */
  data: TData | undefined;
  /** Reset the mutation state */
  reset: () => void;
}

/**
 * Wraps a tRPC mutation with standardized error handling
 *
 * @example
 * ```tsx
 * const createClient = trpc.clients.create.useMutation();
 * const { mutate, isPending, fieldErrors } = useAppMutation(createClient, {
 *   successMessage: "Client created successfully",
 *   onSuccess: (data) => navigate(`/clients/${data.id}`),
 * });
 *
 * // In form submit:
 * mutate({ name: "...", teriCode: "..." });
 *
 * // Show field errors:
 * {fieldErrors?.teriCode && <span className="error">{fieldErrors.teriCode[0]}</span>}
 * ```
 */
export function useAppMutation<TData, TError, TVariables>(
  mutation: {
    mutateAsync: (variables: TVariables) => Promise<TData>;
    reset?: () => void;
  },
  options: UseAppMutationOptions<TData, TError, TVariables> = {}
): UseAppMutationResult<TData, TVariables> {
  const [state, setState] = useState<{
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: AppErrorInfo | null;
    data: TData | undefined;
  }>({
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
  });

  // Prevent double-submits
  const isSubmittingRef = useRef(false);

  const reset = useCallback(() => {
    isSubmittingRef.current = false;
    setState({
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: undefined,
    });
    mutation.reset?.();
  }, [mutation]);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // Prevent double-submits
      if (isSubmittingRef.current) {
        throw new Error("Mutation already in progress");
      }

      isSubmittingRef.current = true;
      setState(prev => ({
        ...prev,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
      }));

      try {
        const data = await mutation.mutateAsync(variables);

        setState({
          isPending: false,
          isSuccess: true,
          isError: false,
          error: null,
          data,
        });

        // Show success toast if configured
        if (options.successMessage) {
          const message =
            typeof options.successMessage === "function"
              ? options.successMessage(data, variables)
              : options.successMessage;
          toast.success(message);
        }

        options.onSuccess?.(data, variables);
        options.onSettled?.(data, undefined, variables);

        isSubmittingRef.current = false;
        return data;
      } catch (err) {
        const errorInfo = normalizeError(err);

        setState({
          isPending: false,
          isSuccess: false,
          isError: true,
          error: errorInfo,
          data: undefined,
        });

        // Log the error
        logError(err, {
          ...options.context,
          variables,
        });

        // Show error toast unless disabled
        if (!options.disableErrorToast) {
          const message =
            options.errorMessage
              ? typeof options.errorMessage === "function"
                ? options.errorMessage(err)
                : options.errorMessage
              : errorInfo.message;
          toast.error(message);
        }

        options.onError?.(errorInfo, variables);
        options.onSettled?.(undefined, errorInfo, variables);

        isSubmittingRef.current = false;
        throw err;
      }
    },
    [mutation, options]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Error is already handled in mutateAsync
      });
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isPending: state.isPending,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
    fieldErrors: state.error?.fieldErrors,
    data: state.data,
    reset,
  };
}

/**
 * Convenience type for the mutation object expected by useAppMutation
 */
export type MutationLike<TData, TVariables> = {
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset?: () => void;
};
