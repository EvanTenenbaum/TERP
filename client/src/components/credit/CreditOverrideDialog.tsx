import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface CreditOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName?: string;
  currentLimit: number;
  onSuccess?: () => void;
}

export const CreditOverrideDialog = React.memo(function CreditOverrideDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  currentLimit,
  onSuccess,
}: CreditOverrideDialogProps) {
  const [newLimit, setNewLimit] = useState<string>(currentLimit.toString());
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const overrideMutation = trpc.credit.manualOverride.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setNewLimit(currentLimit.toString());
      setReason("");
      setError(null);
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const limitValue = parseFloat(newLimit);
    if (isNaN(limitValue) || limitValue < 0) {
      setError("Please enter a valid credit limit");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }

    overrideMutation.mutate({
      clientId,
      newLimit: limitValue,
      reason: reason.trim(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setNewLimit(currentLimit.toString());
      setReason("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Update newLimit when currentLimit changes
  React.useEffect(() => {
    setNewLimit(currentLimit.toString());
  }, [currentLimit]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override Credit Limit</DialogTitle>
          <DialogDescription>
            {clientName 
              ? `Set a manual credit limit for ${clientName}`
              : "Set a manual credit limit for this client"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Calculated Limit */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Calculated Limit</p>
              <p className="text-lg font-semibold">
                ${currentLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* New Limit Input */}
            <div className="space-y-2">
              <Label htmlFor="newLimit">New Credit Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="newLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Override <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're overriding the calculated limit (min 10 characters)..."
                rows={3}
                required
                minLength={10}
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/10 characters minimum
              </p>
            </div>

            {/* Warning */}
            <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Manual overrides persist until changed</p>
                <p className="mt-0.5">
                  The system will not auto-adjust this limit. You'll need to manually update it 
                  or remove the override to return to calculated limits.
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={overrideMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={overrideMutation.isPending || reason.trim().length < 10}
            >
              {overrideMutation.isPending ? "Saving..." : "Save Override"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
