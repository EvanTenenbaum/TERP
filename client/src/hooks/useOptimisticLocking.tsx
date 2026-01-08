/**
 * useOptimisticLocking - Hook for handling concurrent edit conflicts
 * ST-026: Implements concurrent edit detection client-side handling
 *
 * Provides utilities for detecting and handling optimistic lock errors
 * from tRPC mutations.
 *
 * Usage:
 * ```tsx
 * const { handleMutationError, conflictState, ConflictDialogComponent } = useOptimisticLocking({
 *   entityType: "Order",
 *   onRefresh: () => refetch(),
 *   onDiscard: () => navigate("/orders"),
 * });
 *
 * const mutation = trpc.orders.update.useMutation({
 *   onError: handleMutationError,
 * });
 *
 * return (
 *   <>
 *     Your form
 *     {ConflictDialogComponent}
 *   </>
 * );
 * ```
 */

import { useState, useCallback, useMemo } from "react";
import { TRPCClientError } from "@trpc/client";
import { ConflictDialog } from "@/components/common/ConflictDialog";

interface OptimisticLockError {
  code: "CONFLICT";
  message: string;
}

interface UseOptimisticLockingOptions {
  entityType?: string;
  onRefresh: () => void;
  onDiscard: () => void;
}

interface ConflictState {
  isOpen: boolean;
  message?: string;
}

export function useOptimisticLocking({
  entityType = "Record",
  onRefresh,
  onDiscard,
}: UseOptimisticLockingOptions) {
  const [conflictState, setConflictState] = useState<ConflictState>({
    isOpen: false,
  });

  /**
   * Check if an error is an optimistic lock conflict
   */
  const isOptimisticLockError = useCallback((error: unknown): boolean => {
    if (error instanceof TRPCClientError) {
      const data = error.data as OptimisticLockError | undefined;
      return data?.code === "CONFLICT";
    }
    return false;
  }, []);

  /**
   * Extract conflict message from error
   */
  const getConflictMessage = useCallback((error: unknown): string | undefined => {
    if (error instanceof TRPCClientError) {
      return error.message;
    }
    return undefined;
  }, []);

  /**
   * Handle mutation errors - opens conflict dialog if it's an optimistic lock error
   * Returns true if the error was handled, false otherwise
   */
  const handleMutationError = useCallback(
    (error: unknown): boolean => {
      if (isOptimisticLockError(error)) {
        setConflictState({
          isOpen: true,
          message: getConflictMessage(error),
        });
        return true;
      }
      return false;
    },
    [isOptimisticLockError, getConflictMessage]
  );

  /**
   * Close the conflict dialog
   */
  const closeConflictDialog = useCallback(() => {
    setConflictState({ isOpen: false });
  }, []);

  /**
   * Pre-rendered ConflictDialog component as JSX element
   * PERFORMANCE FIX: Using useMemo instead of useCallback to return a JSX element
   * This avoids creating a new component on each render which would cause unnecessary re-renders
   */
  const ConflictDialogComponent = useMemo(
    () => (
      <ConflictDialog
        open={conflictState.isOpen}
        onOpenChange={closeConflictDialog}
        onRefresh={onRefresh}
        onDiscard={onDiscard}
        entityType={entityType}
        message={conflictState.message}
      />
    ),
    [
      conflictState.isOpen,
      conflictState.message,
      closeConflictDialog,
      onRefresh,
      onDiscard,
      entityType,
    ]
  );

  return {
    conflictState,
    isOptimisticLockError,
    handleMutationError,
    closeConflictDialog,
    ConflictDialogComponent,
    // Keep legacy name for backward compatibility
    ConflictDialog: ConflictDialogComponent,
  };
}
