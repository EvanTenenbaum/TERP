/**
 * useConcurrentEditDetection - Client-side hook for handling optimistic locking conflicts
 * UXS-705: Concurrent Edit Detection
 *
 * This hook provides:
 * - Detection of server-side OptimisticLockError (CONFLICT status code)
 * - Conflict dialog UI management
 * - Version tracking for entities
 * - Refresh and retry patterns
 *
 * Works with server-side optimistic locking from server/_core/optimisticLocking.ts
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { TRPCClientError } from "@trpc/client";
import { useWorkSurfaceFeatureFlags } from "./useWorkSurfaceFeatureFlags";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Conflict information returned when a concurrent edit is detected
 */
export interface ConflictInfo {
  entityType: string;
  entityId: number;
  yourVersion: number;
  currentVersion: number;
  timestamp: Date;
}

/**
 * Resolution strategy for conflicts
 */
export type ConflictResolution = "refresh" | "force" | "cancel";

/**
 * Options for the useConcurrentEditDetection hook
 */
export interface UseConcurrentEditDetectionOptions<T extends VersionedEntity> {
  /** Human-readable entity type name (e.g., "Order", "Invoice") */
  entityType: string;

  /** Callback to refetch the entity data after conflict resolution */
  onRefresh: () => Promise<void>;

  /** Optional callback when conflict is detected */
  onConflictDetected?: (conflict: ConflictInfo) => void;

  /** Optional callback when conflict is resolved */
  onConflictResolved?: (resolution: ConflictResolution) => void;
}

/**
 * Return type of useConcurrentEditDetection
 */
export interface UseConcurrentEditDetectionReturn<T extends VersionedEntity> {
  /** Current conflict info, if any */
  conflict: ConflictInfo | null;

  /** Whether the conflict dialog should be shown */
  showConflictDialog: boolean;

  /** Check if an error is a conflict error and handle it */
  handleError: (error: unknown) => boolean;

  /** Resolve the conflict with a given strategy */
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;

  /** Close the conflict dialog without resolving */
  dismissConflict: () => void;

  /** Track version for an entity */
  trackVersion: (entity: T) => void;

  /** Get the tracked version for an entity */
  getTrackedVersion: (entityId: number) => number | undefined;

  /** Check if entity version is stale */
  isVersionStale: (entity: T) => boolean;

  /** Clear all tracked versions */
  clearTrackedVersions: () => void;

  /** Conflict Dialog component */
  ConflictDialog: React.FC;
}

/**
 * Entity with version for optimistic locking
 * Version is optional to handle entities that may not have version tracking enabled
 */
export interface VersionedEntity {
  id: number;
  version?: number;
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse a TRPC error to extract conflict information
 */
function parseConflictError(error: unknown): ConflictInfo | null {
  if (!(error instanceof TRPCClientError)) {
    return null;
  }

  // Check for CONFLICT status code
  if (error.data?.code !== "CONFLICT") {
    return null;
  }

  // Try to parse the message for version info
  // Expected format: "Order #123 has been modified by another user. Your version: 1, Current version: 2."
  const message = error.message;
  const entityMatch = message.match(/^(\w+)\s*#(\d+)/);
  const versionMatch = message.match(/Your version:\s*(\d+),\s*Current version:\s*(\d+)/);

  if (!entityMatch || !versionMatch) {
    // Fallback: return generic conflict info
    return {
      entityType: "Record",
      entityId: 0,
      yourVersion: 0,
      currentVersion: 0,
      timestamp: new Date(),
    };
  }

  return {
    entityType: entityMatch[1],
    entityId: parseInt(entityMatch[2], 10),
    yourVersion: parseInt(versionMatch[1], 10),
    currentVersion: parseInt(versionMatch[2], 10),
    timestamp: new Date(),
  };
}

/**
 * Check if an error is a conflict error
 */
export function isConflictError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) {
    return false;
  }
  return error.data?.code === "CONFLICT";
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling concurrent edit conflicts with optimistic locking
 *
 * @example
 * ```tsx
 * function EditOrderForm({ order }: { order: Order }) {
 *   const {
 *     conflict,
 *     handleError,
 *     resolveConflict,
 *     ConflictDialog,
 *     trackVersion,
 *   } = useConcurrentEditDetection({
 *     entityType: "Order",
 *     onRefresh: async () => {
 *       await refetch();
 *     },
 *   });
 *
 *   // Track the initial version
 *   useEffect(() => {
 *     trackVersion(order);
 *   }, [order]);
 *
 *   const updateMutation = trpc.orders.update.useMutation({
 *     onError: (error) => {
 *       if (!handleError(error)) {
 *         // Handle other errors
 *         toast.error(error.message);
 *       }
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <form>...</form>
 *       <ConflictDialog />
 *     </>
 *   );
 * }
 * ```
 */
export function useConcurrentEditDetection<T extends VersionedEntity>(
  options: UseConcurrentEditDetectionOptions<T>
): UseConcurrentEditDetectionReturn<T> {
  const { entityType, onRefresh, onConflictDetected, onConflictResolved } = options;

  // Check feature flag - UXS-705
  const { flags } = useWorkSurfaceFeatureFlags();
  const isEnabled = flags.concurrentEditEnabled;

  // State
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Version tracking map
  const versionMapRef = useRef<Map<number, number>>(new Map());

  // No-op ConflictDialog when feature is disabled
  const DisabledConflictDialog: React.FC = () => null;

  /**
   * Track version for an entity
   * Only tracks if entity has a version defined
   */
  const trackVersion = useCallback((entity: T) => {
    if (entity.version !== undefined) {
      versionMapRef.current.set(entity.id, entity.version);
    }
  }, []);

  /**
   * Get the tracked version for an entity
   */
  const getTrackedVersion = useCallback((entityId: number): number | undefined => {
    return versionMapRef.current.get(entityId);
  }, []);

  /**
   * Check if an entity's version is stale (different from tracked)
   */
  const isVersionStale = useCallback((entity: T): boolean => {
    const trackedVersion = versionMapRef.current.get(entity.id);
    if (trackedVersion === undefined) {
      return false;
    }
    return entity.version !== trackedVersion;
  }, []);

  /**
   * Clear all tracked versions
   */
  const clearTrackedVersions = useCallback(() => {
    versionMapRef.current.clear();
  }, []);

  /**
   * Handle an error - returns true if it was a conflict error
   */
  const handleError = useCallback(
    (error: unknown): boolean => {
      const conflictInfo = parseConflictError(error);

      if (!conflictInfo) {
        return false;
      }

      // Override entity type with the one from options
      conflictInfo.entityType = entityType;

      setConflict(conflictInfo);
      setShowConflictDialog(true);

      if (onConflictDetected) {
        onConflictDetected(conflictInfo);
      }

      return true;
    },
    [entityType, onConflictDetected]
  );

  /**
   * Resolve the conflict with a given strategy
   */
  const resolveConflict = useCallback(
    async (resolution: ConflictResolution) => {
      setIsResolving(true);

      try {
        switch (resolution) {
          case "refresh":
            // Refresh the data to get the latest version
            await onRefresh();
            break;

          case "force":
            // User chose to force-save (requires special handling in mutation)
            // This is typically handled by the component re-submitting with skipVersionCheck
            break;

          case "cancel":
            // User chose to cancel - just close the dialog
            break;
        }

        setConflict(null);
        setShowConflictDialog(false);

        if (onConflictResolved) {
          onConflictResolved(resolution);
        }
      } finally {
        setIsResolving(false);
      }
    },
    [onRefresh, onConflictResolved]
  );

  /**
   * Dismiss the conflict dialog without resolving
   */
  const dismissConflict = useCallback(() => {
    setConflict(null);
    setShowConflictDialog(false);
  }, []);

  /**
   * Conflict Dialog component
   */
  const ConflictDialog = useMemo(() => {
    return function ConflictDialogComponent() {
      if (!conflict || !showConflictDialog) {
        return null;
      }

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-dialog-title"
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  id="conflict-dialog-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  {conflict.entityType} Has Been Modified
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  This {conflict.entityType.toLowerCase()} was modified by another user while you were
                  editing. Your changes may conflict with theirs.
                </p>
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Your version:</span>
                    <span className="font-mono">{conflict.yourVersion}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Current version:</span>
                    <span className="font-mono">{conflict.currentVersion}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => resolveConflict("refresh")}
                disabled={isResolving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResolving ? "Refreshing..." : "Refresh & Review Changes"}
              </button>
              <button
                onClick={() => resolveConflict("cancel")}
                disabled={isResolving}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel My Changes
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to
              cancel
            </p>
          </div>
        </div>
      );
    };
  }, [conflict, showConflictDialog, resolveConflict, isResolving]);

  // Return no-ops when feature is disabled (UXS-705)
  if (!isEnabled) {
    return {
      conflict: null,
      showConflictDialog: false,
      handleError: () => false, // Don't intercept errors
      resolveConflict: async () => {},
      dismissConflict: () => {},
      trackVersion: () => {},
      getTrackedVersion: () => undefined,
      isVersionStale: () => false,
      clearTrackedVersions: () => {},
      ConflictDialog: DisabledConflictDialog,
    };
  }

  return {
    conflict,
    showConflictDialog,
    handleError,
    resolveConflict,
    dismissConflict,
    trackVersion,
    getTrackedVersion,
    isVersionStale,
    clearTrackedVersions,
    ConflictDialog,
  };
}

// ============================================================================
// UTILITY HOOK FOR SIMPLER USE CASES
// ============================================================================

/**
 * Simplified hook for detecting conflicts without full dialog management
 * Useful when you want to handle conflicts in a custom way
 *
 * @example
 * ```tsx
 * const { isConflict, conflictInfo, resetConflict } = useConflictDetection();
 *
 * const mutation = trpc.orders.update.useMutation({
 *   onError: (error) => {
 *     if (isConflictError(error)) {
 *       // Handle conflict your way
 *       toast.error("Someone else modified this record. Please refresh.");
 *     }
 *   },
 * });
 * ```
 */
export function useConflictDetection() {
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  const checkError = useCallback((error: unknown): ConflictInfo | null => {
    const info = parseConflictError(error);
    setConflictInfo(info);
    return info;
  }, []);

  const resetConflict = useCallback(() => {
    setConflictInfo(null);
  }, []);

  return {
    isConflict: conflictInfo !== null,
    conflictInfo,
    checkError,
    resetConflict,
    isConflictError,
  };
}

export default useConcurrentEditDetection;
