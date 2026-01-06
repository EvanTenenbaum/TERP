/**
 * PromptDialog Component
 * A reusable prompt dialog to replace browser prompt() calls
 *
 * Usage:
 * const [showPrompt, setShowPrompt] = useState(false);
 *
 * <PromptDialog
 *   open={showPrompt}
 *   onOpenChange={setShowPrompt}
 *   title="Enter Reason"
 *   description="Please provide a reason for this action."
 *   placeholder="Enter your reason..."
 *   confirmLabel="Submit"
 *   variant="default"
 *   onConfirm={(value) => handleSubmit(value)}
 * />
 */
import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PromptDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Default value for input */
  defaultValue?: string;
  /** Label for confirm button */
  confirmLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Button variant for confirm action */
  variant?: "default" | "destructive";
  /** Callback when user confirms with the input value */
  onConfirm: (value: string) => void;
  /** Whether confirm action is loading */
  isLoading?: boolean;
  /** Whether to use textarea instead of input */
  multiline?: boolean;
  /** Whether input is required (non-empty) */
  required?: boolean;
}

export const PromptDialog = React.memo(function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  isLoading = false,
  multiline = false,
  required = true,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  // Reset value when dialog opens
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (required && !value.trim()) {
      return; // Don't submit if required and empty
    }
    onConfirm(value);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const isValid = !required || value.trim().length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[100px]"
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
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
 * Hook for managing prompt dialog state
 *
 * Usage:
 * const { showPrompt, prompt, PromptDialogComponent } = usePromptDialog({
 *   title: "Enter Reason",
 *   description: "Please provide a reason.",
 *   onConfirm: (value) => handleSubmit(value),
 * });
 *
 * // In JSX:
 * <Button onClick={prompt}>Open Prompt</Button>
 * <PromptDialogComponent />
 */
export function usePromptDialog(
  props: Omit<PromptDialogProps, "open" | "onOpenChange">
) {
  const [open, setOpen] = React.useState(false);

  const prompt = React.useCallback(() => {
    setOpen(true);
  }, []);

  const PromptDialogComponent = React.useCallback(
    () => <PromptDialog {...props} open={open} onOpenChange={setOpen} />,
    [open, props]
  );

  return {
    showPrompt: open,
    setShowPrompt: setOpen,
    prompt,
    PromptDialogComponent,
  };
}
