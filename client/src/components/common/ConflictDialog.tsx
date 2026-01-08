/**
 * ConflictDialog - Handle concurrent edit conflicts
 * ST-026: Implements concurrent edit detection UI
 *
 * Displays when a user attempts to save changes to a record that was
 * modified by another user since they loaded it. Provides options to
 * refresh and see the latest version or discard their changes.
 */

import React from "react";
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
import { AlertTriangle } from "lucide-react";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onDiscard: () => void;
  entityType?: string; // e.g., "Order", "Client", "Batch"
  message?: string;
}

export const ConflictDialog = React.memo(function ConflictDialog({
  open,
  onOpenChange,
  onRefresh,
  onDiscard,
  entityType = "Record",
  message,
}: ConflictDialogProps): React.ReactElement {
  const handleRefresh = (): void => {
    onRefresh();
    onOpenChange(false);
  };

  const handleDiscard = (): void => {
    onDiscard();
    onOpenChange(false);
  };

  const defaultMessage = `This ${entityType.toLowerCase()} was modified by another user while you were editing. Your changes cannot be saved to prevent data loss.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDialogTitle>Concurrent Edit Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {message || defaultMessage}
          </AlertDialogDescription>
          <AlertDialogDescription className="pt-2 text-sm">
            <strong>Options:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>
                <strong>Refresh:</strong> Reload the latest version and review the changes.
                Your unsaved edits will be lost.
              </li>
              <li>
                <strong>Discard Changes:</strong> Close and return without saving.
              </li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscard}>
            Discard Changes
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRefresh}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Refresh
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
