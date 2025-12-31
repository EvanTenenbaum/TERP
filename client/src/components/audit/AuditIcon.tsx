/**
 * WS-005: Audit Icon Component
 * Subtle "ℹ️" button that opens the audit modal for any calculated field
 */

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AuditIconProps {
  onClick: () => void;
  tooltip?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AuditIcon({
  onClick,
  tooltip = "View calculation breakdown",
  className,
  size = "sm",
}: AuditIconProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const buttonSizeClasses = {
    sm: "h-5 w-5 p-0",
    md: "h-6 w-6 p-0",
    lg: "h-7 w-7 p-0",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              buttonSizeClasses[size],
              "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
              className
            )}
          >
            <Info className={sizeClasses[size]} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
