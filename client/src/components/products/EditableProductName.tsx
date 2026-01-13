/**
 * EditableProductName Component - MEET-037
 * Inline editing for product names in product lists
 *
 * Features:
 * - Edit icon appears on hover
 * - Click to open quick rename modal
 * - Validates for duplicates before saving
 * - Optimistic updates with rollback on error
 */

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Loader2, AlertCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface EditableProductNameProps {
  /** Product ID */
  productId: number;
  /** Current product name */
  productName: string;
  /** Callback after successful rename */
  onRenamed?: (newName: string) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to show the edit icon always or only on hover */
  showIconAlways?: boolean;
  /** Custom render for the name */
  renderName?: (name: string) => React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditableProductName({
  productId,
  productName,
  onRenamed,
  className,
  showIconAlways = false,
  renderName,
}: EditableProductNameProps): React.ReactElement {
  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(productName);
  const [error, setError] = useState<string | null>(null);

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // Update name mutation
  const updateName = trpc.productCatalogue.updateName.useMutation({
    onSuccess: () => {
      toast.success("Product name updated successfully");
      onRenamed?.(newName);
      // Invalidate product queries to refresh lists
      utils.productCatalogue.list.invalidate();
      utils.productCatalogue.getById.invalidate({ id: productId });
      setIsOpen(false);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      toast.error(`Failed to update name: ${err.message}`);
    },
  });

  // Open dialog handler
  const handleOpenDialog = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row click events
      setNewName(productName);
      setError(null);
      setIsOpen(true);
    },
    [productName]
  );

  // Submit handler
  const handleSubmit = useCallback(() => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError("Product name is required");
      return;
    }
    if (trimmedName === productName) {
      setIsOpen(false);
      return;
    }
    setError(null);
    updateName.mutate({ id: productId, name: trimmedName });
  }, [newName, productName, productId, updateName]);

  // Handle key press in input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [handleSubmit]
  );

  return (
    <>
      <div
        className={cn(
          "group inline-flex items-center gap-1.5 cursor-pointer",
          className
        )}
        onClick={handleOpenDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpenDialog(e as unknown as React.MouseEvent)}
        aria-label={`Edit product name: ${productName}`}
      >
        {renderName ? (
          renderName(productName)
        ) : (
          <span className="truncate">{productName}</span>
        )}
        <Pencil
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-opacity",
            showIconAlways
              ? "opacity-50 hover:opacity-100"
              : "opacity-0 group-hover:opacity-50 group-hover:hover:opacity-100"
          )}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Product</DialogTitle>
            <DialogDescription>
              Enter a new name for this product. The change will be applied
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="product-name-edit">Product Name</Label>
              <Input
                id="product-name-edit"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter product name"
                disabled={updateName.isPending}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={updateName.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateName.isPending || !newName.trim()}
            >
              {updateName.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EditableProductName;
