/**
 * WS-005: Audit Icon Component
 * Subtle "ℹ️" button that opens the audit modal for any calculated field or entity
 * 
 * Supports two usage patterns:
 * 1. onClick mode: Pass an onClick handler for custom behavior
 * 2. Entity mode: Pass type, entityId, and optional fieldName to open audit modal
 */

import { useState } from "react";
import { Info, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface AuditIconBaseProps {
  tooltip?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface AuditIconOnClickProps extends AuditIconBaseProps {
  onClick: () => void;
  type?: never;
  entityType?: never;
  entityId?: never;
  fieldName?: never;
}

interface AuditIconEntityProps extends AuditIconBaseProps {
  onClick?: never;
  type?: string; // Alias for entityType (backward compatibility)
  entityType?: string;
  entityId: number;
  fieldName?: string;
}

type AuditIconProps = AuditIconOnClickProps | AuditIconEntityProps;

export function AuditIcon({
  onClick,
  type,
  entityType,
  entityId,
  fieldName,
  tooltip,
  className,
  size = "sm",
}: AuditIconProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Resolve entity type (support both 'type' and 'entityType' props)
  const resolvedEntityType = entityType || type;

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

  // Determine tooltip text
  const tooltipText = tooltip || (fieldName 
    ? `View ${fieldName} calculation breakdown` 
    : "View audit trail");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClick}
              className={cn(
                buttonSizeClasses[size],
                "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
                className
              )}
            >
              {resolvedEntityType === "transaction" ? (
                <History className={sizeClasses[size]} />
              ) : (
                <Info className={sizeClasses[size]} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Audit Trail Modal (for entity mode) */}
      {resolvedEntityType && entityId && (
        <AuditTrailModal
          open={showModal}
          onOpenChange={setShowModal}
          entityType={resolvedEntityType}
          entityId={entityId}
          fieldName={fieldName}
        />
      )}
    </>
  );
}

// Audit Trail Modal Component
interface AuditTrailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: number;
  fieldName?: string;
}

function AuditTrailModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  fieldName,
}: AuditTrailModalProps) {
  const { data: auditLogs, isLoading } = trpc.audit.getEntityHistory.useQuery(
    { entityType, entityId, fieldName },
    { enabled: open }
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail
          </DialogTitle>
          <DialogDescription>
            {fieldName 
              ? `History for ${fieldName} on ${entityType} #${entityId}`
              : `History for ${entityType} #${entityId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading audit history...
            </div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No audit history found</p>
            </div>
          ) : (
            auditLogs.map((log: any, index: number) => (
              <div
                key={log.id || index}
                className="border rounded-lg p-3 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {log.action || log.activityType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt || log.timestamp)}
                  </span>
                </div>
                {log.userName && (
                  <p className="text-sm text-muted-foreground">
                    By: {log.userName}
                  </p>
                )}
                {log.oldValue !== undefined && log.newValue !== undefined && (
                  <div className="mt-2 text-sm">
                    <span className="text-red-600 line-through">{log.oldValue}</span>
                    {" → "}
                    <span className="text-green-600">{log.newValue}</span>
                  </div>
                )}
                {log.details && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
