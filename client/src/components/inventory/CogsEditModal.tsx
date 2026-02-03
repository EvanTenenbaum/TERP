import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CogsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  currentCogs: string;
  batchCode: string;
  onSuccess?: () => void;
}

export function CogsEditModal({
  isOpen,
  onClose,
  batchId,
  currentCogs,
  batchCode,
  onSuccess,
}: CogsEditModalProps) {
  const [newCogs, setNewCogs] = useState(currentCogs);
  const [applyTo, setApplyTo] = useState<
    "FUTURE_SALES" | "PAST_SALES" | "BOTH"
  >("FUTURE_SALES");
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get COGS impact calculation (disabled until cogsManagement module is implemented)
  const { data: impact } = trpc.cogs.calculateImpact.useQuery(
    { batchId, newCogs },
    { enabled: false } // Disabled: COGS management module not yet implemented
  ) as { data: { affectedSales: number; profitImpact: number } | undefined };

  // Mutation for updating COGS
  const updateCogsMutation = trpc.cogs.updateBatchCogs.useMutation({
    onSuccess: () => {
      toast.success(`Successfully updated COGS for batch ${batchCode}`);
      onSuccess?.();
      handleClose();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to update COGS";
      toast.error(message);
    },
  });

  const handleClose = () => {
    setNewCogs(currentCogs);
    setApplyTo("FUTURE_SALES");
    setReason("");
    setShowConfirmation(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!newCogs || parseFloat(newCogs) <= 0) {
      toast.error("COGS must be greater than 0");
      return;
    }

    if (newCogs === currentCogs) {
      toast.error("New COGS is the same as current COGS");
      return;
    }

    // Show confirmation for retroactive changes
    if (applyTo === "PAST_SALES" || applyTo === "BOTH") {
      setShowConfirmation(true);
    } else {
      confirmUpdate();
    }
  };

  const confirmUpdate = () => {
    updateCogsMutation.mutate({
      batchId,
      newCogs,
      applyTo,
      reason: reason || "COGS adjustment",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (showConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm COGS Change</DialogTitle>
            <DialogDescription>
              You are about to change COGS retroactively. This will affect past
              sales records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action will update accounting
                records and cannot be easily undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch:</span>
                <span className="font-medium">{batchCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Old COGS:</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(currentCogs))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New COGS:</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(newCogs))}
                </span>
              </div>
              {impact && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Affected Sales:
                    </span>
                    <span className="font-medium">{impact.affectedSales}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Profit Impact:
                    </span>
                    <span
                      className={`font-medium ${impact.profitImpact < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatCurrency(impact.profitImpact)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdate}
              disabled={updateCogsMutation.isPending}
            >
              {updateCogsMutation.isPending ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit COGS</DialogTitle>
          <DialogDescription>
            Update the cost of goods sold for batch {batchCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current COGS Display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Current COGS:</span>
            <span className="text-lg font-semibold">
              {formatCurrency(parseFloat(currentCogs))}
            </span>
          </div>

          {/* New COGS Input */}
          <div className="space-y-2">
            <Label htmlFor="newCogs">New COGS</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newCogs"
                type="number"
                step="0.01"
                min="0"
                value={newCogs}
                onChange={e => setNewCogs(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Apply To Radio Group */}
          <div className="space-y-3">
            <Label>Apply Changes To:</Label>
            <RadioGroup
              value={applyTo}
              onValueChange={value => setApplyTo(value as typeof applyTo)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FUTURE_SALES" id="future" />
                <Label htmlFor="future" className="font-normal cursor-pointer">
                  Future Sales Only (Prospective)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PAST_SALES" id="past" />
                <Label htmlFor="past" className="font-normal cursor-pointer">
                  Past Sales Only (Retroactive)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BOTH" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">
                  Both Past and Future Sales
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Warning for retroactive changes */}
          {(applyTo === "PAST_SALES" || applyTo === "BOTH") && impact && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will affect <strong>{impact.affectedSales}</strong> past
                sale(s) and change profit by{" "}
                <strong
                  className={
                    impact.profitImpact < 0 ? "text-red-600" : "text-green-600"
                  }
                >
                  {formatCurrency(impact.profitImpact)}
                </strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Vendor price adjustment"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateCogsMutation.isPending}
          >
            {updateCogsMutation.isPending ? "Updating..." : "Update COGS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
