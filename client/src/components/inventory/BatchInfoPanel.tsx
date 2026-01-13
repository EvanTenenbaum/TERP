/**
 * BatchInfoPanel Component
 * Sprint 4 Track A: 4.A.6 MEET-023 - Batch Tracking for Inventory
 *
 * Features:
 * - Show batch code prominently
 * - Lot ID display
 * - Received date and intake date
 * - Batch history link
 * - Copy to clipboard functionality
 */

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  Hash,
  Calendar,
  Clock,
  Copy,
  Check,
  ExternalLink,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface BatchInfo {
  batchId: string;
  lotId: string | null;
  receivedDate: Date | string | null;
  intakeDate: Date | string | null;
}

interface BatchInfoPanelProps {
  batchInfo: BatchInfo;
  batchId: number; // Database ID for navigation
  className?: string;
  variant?: "card" | "inline" | "compact";
  showHistoryLink?: boolean;
}

export const BatchInfoPanel = memo(function BatchInfoPanel({
  batchInfo,
  batchId,
  className,
  variant = "card",
  showHistoryLink = true,
}: BatchInfoPanelProps) {
  const [, setLocation] = useLocation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Silently fail
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM d, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const navigateToHistory = () => {
    setLocation(`/inventory/${batchId}?tab=history`);
  };

  const navigateToFilterByBatch = () => {
    setLocation(`/inventory?batchId=${encodeURIComponent(batchInfo.batchId)}`);
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => copyToClipboard(batchInfo.batchId, "batch")}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
              >
                <Hash className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-xs">{batchInfo.batchId}</span>
                {copiedField === "batch" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to copy batch code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {batchInfo.lotId && (
          <Badge variant="outline" className="text-xs">
            Lot: {batchInfo.lotId}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Batch:</span>
            <button
              onClick={() => copyToClipboard(batchInfo.batchId, "batch")}
              className="flex items-center gap-1 font-mono text-sm font-medium hover:text-primary transition-colors"
            >
              {batchInfo.batchId}
              {copiedField === "batch" ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>

          {batchInfo.lotId && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Lot:</span>
              <span className="font-mono text-sm">{batchInfo.lotId}</span>
            </div>
          )}

          {batchInfo.receivedDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Received:</span>
              <span className="text-sm">{formatDate(batchInfo.receivedDate)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Batch Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch Code - Prominent Display */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Batch Code
              </p>
              <button
                onClick={() => copyToClipboard(batchInfo.batchId, "batch")}
                className="flex items-center gap-2 mt-1 group"
              >
                <span className="font-mono text-lg font-bold">
                  {batchInfo.batchId}
                </span>
                {copiedField === "batch" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToFilterByBatch}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Related
            </Button>
          </div>
        </div>

        {/* Lot ID */}
        {batchInfo.lotId && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Lot ID
            </p>
            <p className="font-mono mt-1">{batchInfo.lotId}</p>
          </div>
        )}

        <Separator />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
              <Calendar className="h-3 w-3" />
              Received Date
            </div>
            <p className="mt-1 text-sm">{formatDate(batchInfo.receivedDate)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3 w-3" />
              Intake Date
            </div>
            <p className="mt-1 text-sm">{formatDateTime(batchInfo.intakeDate)}</p>
          </div>
        </div>

        {/* History Link */}
        {showHistoryLink && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={navigateToHistory}
            >
              <History className="h-4 w-4 mr-2" />
              View Batch History
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
});
