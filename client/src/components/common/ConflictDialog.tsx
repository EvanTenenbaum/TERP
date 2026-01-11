/**
 * ConflictDialog - Handle concurrent edit conflicts
 * ST-026: Implements concurrent edit detection UI
 *
 * Displays when a user attempts to save changes to a record that was
 * modified by another user since they loaded it. Provides options to:
 * - Refresh and see the latest version
 * - Discard changes and close
 * - Force overwrite (with warning) - optional, requires explicit opt-in
 */

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, X, AlertOctagon } from "lucide-react";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onDiscard: () => void;
  onForceOverwrite?: () => void; // Optional: allow force overwrite
  entityType?: string; // e.g., "Order", "Client", "Batch"
  entityId?: number | string;
  yourVersion?: number;
  currentVersion?: number;
  message?: string;
  isLoading?: boolean;
}

export const ConflictDialog = React.memo(function ConflictDialog({
  open,
  onOpenChange,
  onRefresh,
  onDiscard,
  onForceOverwrite,
  entityType = "Record",
  entityId,
  yourVersion,
  currentVersion,
  message,
  isLoading = false,
}: ConflictDialogProps): React.ReactElement {
  const [showForceWarning, setShowForceWarning] = useState(false);

  const handleRefresh = (): void => {
    onRefresh();
    onOpenChange(false);
  };

  const handleDiscard = (): void => {
    onDiscard();
    onOpenChange(false);
  };

  const handleForceOverwrite = (): void => {
    if (onForceOverwrite) {
      onForceOverwrite();
      onOpenChange(false);
      setShowForceWarning(false);
    }
  };

  const defaultMessage = `This ${entityType.toLowerCase()} was modified by another user while you were editing. Your changes cannot be saved to prevent data loss.`;

  const versionInfo = yourVersion !== undefined && currentVersion !== undefined
    ? `Your version: ${yourVersion}, Server version: ${currentVersion}`
    : null;

  // Force overwrite warning view
  if (showForceWarning && onForceOverwrite) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Warning: Force Overwrite</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-red-600 font-medium">
              You are about to overwrite changes made by another user!
            </AlertDialogDescription>
            <AlertDialogDescription className="pt-2 text-sm">
              This action will permanently discard the other user&apos;s changes.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowForceWarning(false)}
              disabled={isLoading}
            >
              Go Back
            </AlertDialogCancel>
            <Button
              onClick={handleForceOverwrite}
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Yes, Overwrite"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDialogTitle>Concurrent Edit Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {message || defaultMessage}
          </AlertDialogDescription>
          {versionInfo && (
            <AlertDialogDescription className="pt-1 text-xs text-muted-foreground">
              {entityId && `${entityType} #${entityId} - `}{versionInfo}
            </AlertDialogDescription>
          )}
          <AlertDialogDescription className="pt-3 text-sm">
            <strong>What would you like to do?</strong>
            <ul className="mt-2 ml-4 list-disc space-y-2">
              <li>
                <span className="font-medium">Refresh:</span> Reload the latest version and review the changes.
                Your unsaved edits will be lost.
              </li>
              <li>
                <span className="font-medium">Discard Changes:</span> Close and return without saving.
              </li>
              {onForceOverwrite && (
                <li>
                  <span className="font-medium text-red-600">Force Overwrite:</span>{" "}
                  <span className="text-red-600">Save your changes anyway</span> (may discard the other user&apos;s work).
                </li>
              )}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={handleDiscard}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Discard Changes
          </AlertDialogCancel>
          {onForceOverwrite && (
            <Button
              onClick={() => setShowForceWarning(true)}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              disabled={isLoading}
            >
              Force Overwrite
            </Button>
          )}
          <AlertDialogAction
            onClick={handleRefresh}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading ? "Loading..." : "Refresh"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

/**
 * Hook to detect and handle optimistic locking (conflict) errors from tRPC
 *
 * Usage:
 * const { isConflict, conflictInfo, handleError, resetConflict } = useConflictDetection();
 *
 * // In mutation error handler:
 * onError: (error) => {
 *   if (handleError(error)) {
 *     // It's a conflict error, dialog will show
 *     return;
 *   }
 *   // Handle other errors
 * }
 */
export interface ConflictInfo {
  entityType: string;
  entityId: number;
  yourVersion: number;
  currentVersion: number;
  message: string;
}

export function useConflictDetection() {
  const [isConflict, setIsConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  const handleError = (error: unknown): boolean => {
    // Check if this is a CONFLICT error from tRPC
    const trpcError = error as { data?: { code?: string }; message?: string };

    if (trpcError?.data?.code === "CONFLICT" || trpcError?.message?.includes("has been modified by another user")) {
      // Parse conflict info from error message
      // Format: "{EntityType} #{id} has been modified by another user. Your version: X, Current version: Y."
      const message = trpcError.message || "Record was modified by another user.";
      const match = message.match(/(\w+)\s+#(\d+).*Your version:\s*(\d+),\s*Current version:\s*(\d+)/i);

      if (match) {
        setConflictInfo({
          entityType: match[1],
          entityId: parseInt(match[2], 10),
          yourVersion: parseInt(match[3], 10),
          currentVersion: parseInt(match[4], 10),
          message,
        });
      } else {
        setConflictInfo({
          entityType: "Record",
          entityId: 0,
          yourVersion: 0,
          currentVersion: 0,
          message,
        });
      }

      setIsConflict(true);
      return true;
    }

    return false;
  };

  const resetConflict = () => {
    setIsConflict(false);
    setConflictInfo(null);
  };

  return {
    isConflict,
    conflictInfo,
    handleError,
    resetConflict,
    setIsConflict,
  };
}
