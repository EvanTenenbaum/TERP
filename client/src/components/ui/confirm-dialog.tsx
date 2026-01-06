/**
 * ConfirmDialog Component
 * A reusable confirmation dialog to replace browser confirm() calls
 *
 * Usage:
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Item"
 *   description="Are you sure you want to delete this item? This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={() => handleDelete()}
 * />
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message - supports string or ReactNode for rich content */
  description: string | React.ReactNode;
  /** Label for confirm button */
  confirmLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Button variant for confirm action */
  variant?: "default" | "destructive";
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Whether confirm action is loading */
  isLoading?: boolean;
}

export const ConfirmDialog = React.memo(function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              variant === "destructive" &&
                buttonVariants({ variant: "destructive" })
            )}
          >
            {isLoading ? "Loading..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

/**
 * Hook for managing confirm dialog state
 *
 * Usage:
 * const { showConfirm, confirm, ConfirmDialogComponent } = useConfirmDialog({
 *   title: "Delete Item",
 *   description: "Are you sure?",
 *   onConfirm: () => deleteItem(),
 * });
 *
 * // In JSX:
 * <Button onClick={confirm}>Delete</Button>
 * <ConfirmDialogComponent />
 */
export function useConfirmDialog(
  props: Omit<ConfirmDialogProps, "open" | "onOpenChange">
) {
  const [open, setOpen] = React.useState(false);

  const confirm = React.useCallback(() => {
    setOpen(true);
  }, []);

  const ConfirmDialogComponent = React.useCallback(
    () => <ConfirmDialog {...props} open={open} onOpenChange={setOpen} />,
    [open, props]
  );

  return {
    showConfirm: open,
    setShowConfirm: setOpen,
    confirm,
    ConfirmDialogComponent,
  };
}
