/**
 * Intake Progress Dialog
 * TER-1228: Display progress and rollback UI for multi-entity intake transactions
 */

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Circle, AlertTriangle } from "lucide-react";
import type { IntakeProgress, IntakeStep } from "@shared/intakeProgress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface IntakeProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: IntakeProgress | null;
  error?: string;
  onRollbackComplete?: () => void;
}

function StepIcon({ step }: { step: IntakeStep }) {
  switch (step.status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "running":
      return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300" />;
  }
}

export function IntakeProgressDialog({
  open,
  onOpenChange,
  progress,
  error,
  onRollbackComplete,
}: IntakeProgressDialogProps) {
  const rollbackMutation = trpc.inventory.rollbackIntake.useMutation();

  const rollbackTargets = useMemo(() => {
    if (!progress) return [];
    return progress.steps
      .filter((step) => step.status === "complete" && step.entityId)
      .map((step) => ({
        step: step.name,
        entityId: step.entityId!,
      }));
  }, [progress]);

  const handleRollback = async () => {
    if (!progress || !progress.canRollback) return;

    try {
      const result = await rollbackMutation.mutateAsync({
        targets: rollbackTargets,
      });

      if (result.success) {
        toast.success(
          `Rolled back ${result.rolledBackSteps.length} step${result.rolledBackSteps.length !== 1 ? "s" : ""}`
        );
        onRollbackComplete?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Rollback failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rollback failed");
    }
  };

  if (!progress) return null;

  const isSuccess = !progress.failedStep && progress.completedSteps.length > 0;
  const isFailed = !!progress.failedStep;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Intake Completed
              </>
            )}
            {isFailed && (
              <>
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Intake Failed
              </>
            )}
            {!isSuccess && !isFailed && (
              <>
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                Processing Intake...
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSuccess && "All steps completed successfully."}
            {isFailed && (
              <span className="text-red-600">
                {error || "Transaction failed. You can roll back the completed steps."}
              </span>
            )}
            {!isSuccess && !isFailed && "Processing multi-entity intake transaction."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {progress.steps.map((step) => (
            <div
              key={step.name}
              className="flex items-start gap-3 p-2 rounded border border-gray-100"
            >
              <div className="flex-shrink-0 mt-0.5">
                <StepIcon step={step} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{step.label}</p>
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">{step.error}</p>
                )}
                {step.status === "complete" && step.entityId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {step.entityId}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {isSuccess && (
          <div className="rounded bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">
              Successfully created {progress.completedSteps.length} entities
            </p>
          </div>
        )}

        {isFailed && progress.canRollback && (
          <div className="rounded bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              {progress.completedSteps.length} step{progress.completedSteps.length !== 1 ? "s" : ""}{" "}
              completed before failure. You can roll back these changes.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isSuccess && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}

          {isFailed && progress.canRollback && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={rollbackMutation.isPending}
              >
                Keep Changes
              </Button>
              <Button
                variant="destructive"
                onClick={handleRollback}
                disabled={rollbackMutation.isPending}
              >
                {rollbackMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rolling Back...
                  </>
                ) : (
                  "Rollback Completed Steps"
                )}
              </Button>
            </>
          )}

          {isFailed && !progress.canRollback && (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
