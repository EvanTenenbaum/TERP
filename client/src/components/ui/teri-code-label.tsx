/**
 * TeriCodeLabel Component
 * CHAOS-028: Add tooltip explaining what "TERI Code" means
 *
 * TERI Code is the unique identifier assigned to each client in the system.
 * Format: CLI-XXXXXXXX (8 alphanumeric characters after prefix)
 */

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TeriCodeLabelProps {
  /** Optional custom label text (defaults to "TERI Code") */
  label?: string;
  /** Additional class names */
  className?: string;
  /** Whether to show the help icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "default";
}

/**
 * Label component for TERI Code fields with built-in tooltip explanation
 */
export function TeriCodeLabel({
  label = "TERI Code",
  className,
  showIcon = true,
  size = "default",
}: TeriCodeLabelProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        size === "sm" && "text-sm",
        className
      )}
    >
      {label}
      {showIcon && (
        <HelpCircle
          className={cn(
            "text-muted-foreground cursor-help",
            size === "sm" ? "h-3 w-3" : "h-4 w-4"
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );

  if (!showIcon) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1 cursor-help"
          tabIndex={0}
          role="button"
          aria-label={`${label}: Unique client identifier`}
        >
          {label}
          <HelpCircle
            className={cn(
              "text-muted-foreground",
              size === "sm" ? "h-3 w-3" : "h-4 w-4"
            )}
            aria-hidden="true"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium mb-1">TERI Code</p>
        <p className="text-xs">
          Unique identifier assigned to each client in the system.
          Format: CLI-XXXXXXXX (8 alphanumeric characters).
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default TeriCodeLabel;
