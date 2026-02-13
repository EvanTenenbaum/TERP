/**
 * useSaveState - Work Surface save state indicator management
 * UXS-102: Implements the 3-state save indicator for Work Surfaces
 *
 * Save States (from ATOMIC_UX_STRATEGY.md):
 * - ✅ Saved (green): Persisted to server
 * - 🟡 Saving (yellow): Request in flight
 * - 🔴 Needs attention (red): Validation error or conflict
 * - 🟠 Queued (orange): Offline, pending sync (BETA - UXS-702)
 *
 * Usage:
 * ```tsx
 * const { saveState, setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
 *
 * const mutation = trpc.items.update.useMutation({
 *   onMutate: () => setSaving(),
 *   onSuccess: () => setSaved(),
 *   onError: (err) => setError(err.message),
 * });
 *
 * return (
 *   <div>
 *     <SaveStateIndicator />
 *     ...
 *   </div>
 * );
 * ```
 *
 * Integration with useAppMutation:
 * ```tsx
 * const mutation = useAppMutation(trpc.items.update, {
 *   saveStateHook: useSaveState(), // Auto-wires states
 * });
 * ```
 *
 * @see useAppMutation.ts - Integrate with existing mutation wrapper
 * @see useOptimisticLocking.tsx - Reference pattern for component return
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { CheckCircle, Loader2, AlertCircle, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type SaveStateStatus = "saved" | "saving" | "error" | "queued";

export interface SaveState {
  status: SaveStateStatus;
  message?: string;
  /** Timestamp of last successful save */
  lastSaved?: Date;
  /** Error details for debugging */
  errorDetails?: unknown;
}

export interface UseSaveStateOptions {
  /** Initial state (default: saved) */
  initialState?: SaveStateStatus;
  /** Auto-reset to 'saved' after error display (ms, default: 5000) */
  errorResetDelay?: number;
  /** Callback when state changes */
  onStateChange?: (state: SaveState) => void;
  /** Enable offline queue state (requires UXS-702) */
  offlineSupported?: boolean;
}

export interface UseSaveStateReturn {
  /** Current save state */
  saveState: SaveState;
  /** Transition to saving state */
  setSaving: (message?: string) => void;
  /** Transition to saved state */
  setSaved: () => void;
  /** Transition to error state */
  setError: (message: string, details?: unknown) => void;
  /** Transition to queued state (offline) */
  setQueued: (message?: string) => void;
  /** Reset to saved state */
  reset: () => void;
  /** Pre-rendered indicator component */
  SaveStateIndicator: React.ReactNode;
  /** Whether there's a pending change */
  isDirty: boolean;
}

// ============================================================================
// SAVE STATE INDICATOR COMPONENT
// ============================================================================

interface IndicatorProps {
  state: SaveState;
  className?: string;
}

function SaveStateIndicatorComponent({ state, className }: IndicatorProps) {
  const config = useMemo(() => {
    switch (state.status) {
      case "saved":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          label: "Saved",
          ariaLabel: "All changes saved",
        };
      case "saving":
        return {
          icon: Loader2,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          label: "Saving...",
          ariaLabel: "Saving changes",
          animate: true,
        };
      case "error":
        return {
          icon: AlertCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          label: state.message || "Needs attention",
          ariaLabel: `Error: ${state.message || "Changes could not be saved"}`,
        };
      case "queued":
        return {
          icon: CloudOff,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          label: "Queued",
          ariaLabel: "Changes queued for sync when online",
        };
    }
  }, [state]);

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-colors duration-300",
        config.bgColor,
        config.color,
        className
      )}
      role="status"
      aria-label={config.ariaLabel}
      aria-live="polite"
    >
      <Icon
        className={cn("h-4 w-4", config.animate && "animate-spin")}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  );
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSaveState({
  initialState = "saved",
  errorResetDelay = 5000,
  onStateChange,
  offlineSupported = false,
}: UseSaveStateOptions = {}): UseSaveStateReturn {
  const [saveState, setSaveState] = useState<SaveState>({
    status: initialState,
    lastSaved: initialState === "saved" ? new Date() : undefined,
  });

  // Track dirty state (any change since last save)
  const [isDirty, setIsDirty] = useState(false);

  // Timer ref for error auto-reset
  const errorResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (errorResetTimer.current) {
        clearTimeout(errorResetTimer.current);
      }
    };
  }, []);

  // Notify on state change
  useEffect(() => {
    onStateChange?.(saveState);
  }, [saveState, onStateChange]);

  // ============================================================================
  // State transitions
  // ============================================================================

  const setSaving = useCallback((message?: string) => {
    // Clear any pending error reset
    if (errorResetTimer.current) {
      clearTimeout(errorResetTimer.current);
      errorResetTimer.current = null;
    }

    setSaveState({
      status: "saving",
      message: message || "Saving changes...",
    });
    setIsDirty(true);
  }, []);

  const setSaved = useCallback(() => {
    setSaveState({
      status: "saved",
      lastSaved: new Date(),
    });
    setIsDirty(false);
  }, []);

  const setError = useCallback(
    (message: string, details?: unknown) => {
      setSaveState({
        status: "error",
        message,
        errorDetails: details,
      });

      // Auto-reset to saved after delay (keeps dirty state)
      if (errorResetDelay > 0) {
        errorResetTimer.current = setTimeout(() => {
          setSaveState((prev) => ({
            ...prev,
            status: "saved",
            message: undefined,
          }));
        }, errorResetDelay);
      }
    },
    [errorResetDelay]
  );

  const setQueued = useCallback(
    (message?: string) => {
      if (!offlineSupported) {
        console.warn("useSaveState: Offline queue not enabled. Set offlineSupported: true");
        return;
      }

      setSaveState({
        status: "queued",
        message: message || "Will sync when online",
      });
    },
    [offlineSupported]
  );

  const reset = useCallback(() => {
    if (errorResetTimer.current) {
      clearTimeout(errorResetTimer.current);
      errorResetTimer.current = null;
    }

    setSaveState({
      status: "saved",
      lastSaved: new Date(),
    });
    setIsDirty(false);
  }, []);

  // ============================================================================
  // Pre-rendered component
  // ============================================================================

  const SaveStateIndicator = useMemo(
    () => <SaveStateIndicatorComponent state={saveState} />,
    [saveState]
  );

  return {
    saveState,
    setSaving,
    setSaved,
    setError,
    setQueued,
    reset,
    SaveStateIndicator,
    isDirty,
  };
}

export default useSaveState;
