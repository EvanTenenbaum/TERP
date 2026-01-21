/**
 * useToastConfig Hook (UXS-902)
 *
 * Standardized toast behavior for Work Surfaces.
 * Provides consistent position, stacking, and duration rules.
 *
 * Rules:
 * - Position: Bottom-right for all toasts
 * - Stacking: Max 3 visible, newest on top
 * - Duration: Success 3s, Info 4s, Warning 5s, Error persist until dismissed
 * - Auto-dismiss: Except for errors and undo toasts
 *
 * @see ATOMIC_UX_STRATEGY.md for toast requirements
 */

import { useCallback, useMemo } from 'react';
import { toast, type ExternalToast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface ToastDurations {
  /** Success toast duration (ms) */
  success: number;
  /** Info toast duration (ms) */
  info: number;
  /** Warning toast duration (ms) */
  warning: number;
  /** Error toast duration (ms) - 0 means persist */
  error: number;
  /** Loading toast duration (ms) - 0 means persist until dismissed */
  loading: number;
}

export interface ToastConfig {
  /** Maximum visible toasts */
  maxVisible: number;
  /** Toast position */
  position: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  /** Rich colors for different types */
  richColors: boolean;
  /** Close button visibility */
  closeButton: boolean;
  /** Default durations by type */
  durations: ToastDurations;
}

export interface UseToastConfigReturn {
  /** Show success toast */
  success: (message: string, options?: ExternalToast) => string | number;
  /** Show error toast (persists until dismissed) */
  error: (message: string, options?: ExternalToast) => string | number;
  /** Show warning toast */
  warning: (message: string, options?: ExternalToast) => string | number;
  /** Show info toast */
  info: (message: string, options?: ExternalToast) => string | number;
  /** Show loading toast (returns dismiss function) */
  loading: (message: string, options?: ExternalToast) => string | number;
  /** Show promise toast */
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => Promise<T>;
  /** Dismiss a specific toast */
  dismiss: (toastId?: string | number) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Show action toast (with undo or custom action) */
  action: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    options?: ExternalToast
  ) => string | number;
  /** Current config */
  config: ToastConfig;
}

// ============================================================================
// Constants
// ============================================================================

/** Default toast configuration - UXS-902 standards */
export const DEFAULT_TOAST_CONFIG: ToastConfig = {
  maxVisible: 3,
  position: 'bottom-right',
  richColors: true,
  closeButton: true,
  durations: {
    success: 3000,
    info: 4000,
    warning: 5000,
    error: 0, // Persist until dismissed
    loading: 0, // Persist until dismissed
  },
};

/**
 * Toast position descriptions for documentation
 */
export const TOAST_POSITION_DESCRIPTIONS = {
  'bottom-right': 'Default position - non-intrusive, visible',
  'bottom-left': 'Alternative for RTL layouts',
  'bottom-center': 'Centered attention',
  'top-right': 'High visibility, may overlap navigation',
  'top-left': 'High visibility, may overlap sidebar',
  'top-center': 'Maximum visibility, most intrusive',
} as const;

/**
 * Toast type descriptions for documentation
 */
export const TOAST_TYPE_GUIDELINES = {
  success: 'Confirmations of completed actions (save, update, delete)',
  info: 'Informational messages, tips, non-critical updates',
  warning: 'Cautions that require attention but not immediate action',
  error: 'Failures requiring user acknowledgment or action',
  loading: 'Ongoing operations (save in progress, fetching)',
} as const;

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for standardized toast notifications
 *
 * @example
 * ```tsx
 * const toasts = useToastConfig();
 *
 * // Simple success
 * toasts.success('Order saved');
 *
 * // Error (persists until dismissed)
 * toasts.error('Failed to save order');
 *
 * // With undo action
 * toasts.action(
 *   'Item deleted',
 *   'Undo',
 *   () => restoreItem(item),
 *   { duration: 10000 } // Undo window
 * );
 *
 * // Promise toast
 * toasts.promise(saveOrder(), {
 *   loading: 'Saving order...',
 *   success: 'Order saved!',
 *   error: 'Failed to save order',
 * });
 * ```
 */
export function useToastConfig(
  customConfig?: Partial<ToastConfig>
): UseToastConfigReturn {
  const config: ToastConfig = useMemo(
    () => ({
      ...DEFAULT_TOAST_CONFIG,
      ...customConfig,
      durations: {
        ...DEFAULT_TOAST_CONFIG.durations,
        ...customConfig?.durations,
      },
    }),
    [customConfig]
  );

  const success = useCallback(
    (message: string, options?: ExternalToast) => {
      return toast.success(message, {
        duration: config.durations.success,
        position: config.position,
        closeButton: config.closeButton,
        ...options,
      });
    },
    [config]
  );

  const error = useCallback(
    (message: string, options?: ExternalToast) => {
      return toast.error(message, {
        duration: config.durations.error || Infinity,
        position: config.position,
        closeButton: true, // Always show close for errors
        ...options,
      });
    },
    [config]
  );

  const warning = useCallback(
    (message: string, options?: ExternalToast) => {
      return toast.warning(message, {
        duration: config.durations.warning,
        position: config.position,
        closeButton: config.closeButton,
        ...options,
      });
    },
    [config]
  );

  const info = useCallback(
    (message: string, options?: ExternalToast) => {
      return toast.info(message, {
        duration: config.durations.info,
        position: config.position,
        closeButton: config.closeButton,
        ...options,
      });
    },
    [config]
  );

  const loading = useCallback(
    (message: string, options?: ExternalToast) => {
      return toast.loading(message, {
        position: config.position,
        ...options,
      });
    },
    [config]
  );

  const promiseFn = useCallback(
    <T>(
      promise: Promise<T> | (() => Promise<T>),
      options: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: unknown) => string);
      }
    ): Promise<T> => {
      const actualPromise = typeof promise === 'function' ? promise() : promise;
      toast.promise(actualPromise, {
        loading: options.loading,
        success: options.success,
        error: options.error,
      });
      return actualPromise;
    },
    []
  );

  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  const action = useCallback(
    (
      message: string,
      actionLabel: string,
      onAction: () => void,
      options?: ExternalToast
    ) => {
      return toast(message, {
        position: config.position,
        duration: 5000,
        action: {
          label: actionLabel,
          onClick: onAction,
        },
        ...options,
      });
    },
    [config]
  );

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise: promiseFn,
    dismiss,
    dismissAll,
    action,
    config,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick toast helpers - use for simple cases without the hook
 */
export const quickToast = {
  /** Quick success toast */
  success: (message: string) =>
    toast.success(message, { duration: DEFAULT_TOAST_CONFIG.durations.success }),
  /** Quick error toast (persists) */
  error: (message: string) =>
    toast.error(message, { duration: Infinity }),
  /** Quick warning toast */
  warning: (message: string) =>
    toast.warning(message, { duration: DEFAULT_TOAST_CONFIG.durations.warning }),
  /** Quick info toast */
  info: (message: string) =>
    toast.info(message, { duration: DEFAULT_TOAST_CONFIG.durations.info }),
};

/**
 * Form-specific toast helpers
 */
export const formToast = {
  /** Form saved successfully */
  saved: (entity: string = 'Changes') =>
    toast.success(`${entity} saved`, { duration: 3000 }),
  /** Form save failed */
  saveFailed: (entity: string = 'Changes', error?: string) =>
    toast.error(`Failed to save ${entity.toLowerCase()}${error ? `: ${error}` : ''}`, {
      duration: Infinity,
    }),
  /** Validation error */
  validationError: (message: string = 'Please fix the errors below') =>
    toast.warning(message, { duration: 5000 }),
  /** Required fields missing */
  requiredFields: () =>
    toast.warning('Please fill in all required fields', { duration: 5000 }),
};

/**
 * CRUD operation toast helpers
 */
export const crudToast = {
  /** Item created */
  created: (entity: string) =>
    toast.success(`${entity} created`, { duration: 3000 }),
  /** Item updated */
  updated: (entity: string) =>
    toast.success(`${entity} updated`, { duration: 3000 }),
  /** Item deleted (with potential undo) */
  deleted: (entity: string, onUndo?: () => void) => {
    if (onUndo) {
      return toast(`${entity} deleted`, {
        duration: 10000,
        action: { label: 'Undo', onClick: onUndo },
      });
    }
    return toast.success(`${entity} deleted`, { duration: 3000 });
  },
  /** Operation failed */
  failed: (operation: string, error?: string) =>
    toast.error(`Failed to ${operation.toLowerCase()}${error ? `: ${error}` : ''}`, {
      duration: Infinity,
    }),
};

/**
 * Bulk operation toast helpers
 */
export const bulkToast = {
  /** Bulk operation started */
  started: (count: number, operation: string) =>
    toast.loading(`Processing ${count} items...`, { duration: Infinity }),
  /** Bulk operation complete */
  complete: (count: number, operation: string) =>
    toast.success(`${operation} ${count} items`, { duration: 3000 }),
  /** Bulk operation partial failure */
  partial: (succeeded: number, failed: number, operation: string) =>
    toast.warning(
      `${operation}: ${succeeded} succeeded, ${failed} failed`,
      { duration: 5000 }
    ),
  /** Bulk operation failed */
  failed: (operation: string, error?: string) =>
    toast.error(`Bulk ${operation.toLowerCase()} failed${error ? `: ${error}` : ''}`, {
      duration: Infinity,
    }),
};

export default useToastConfig;
