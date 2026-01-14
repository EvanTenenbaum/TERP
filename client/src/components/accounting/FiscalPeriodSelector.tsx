import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateRange } from "@/lib/dateFormat";

export type FiscalPeriodStatus = "OPEN" | "CLOSED" | "LOCKED";

interface FiscalPeriodSelectorProps {
  value?: number;
  onChange?: (periodId: number) => void;
  status?: FiscalPeriodStatus;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showStatus?: boolean;
}

/**
 * FiscalPeriodSelector - Dropdown for selecting fiscal periods
 * 
 * Features:
 * - Fetches fiscal periods from API
 * - Optional filtering by status (OPEN, CLOSED, LOCKED)
 * - Shows period name, date range, and status
 * - Highlights current period
 * - Loading state
 */
export function FiscalPeriodSelector({
  value,
  onChange,
  status,
  placeholder = "Select fiscal period...",
  disabled = false,
  className,
  showStatus = true,
}: FiscalPeriodSelectorProps) {
  const { data: periods, isLoading } = trpc.accounting.fiscalPeriods.list.useQuery({
    status,
  });

  const { data: currentPeriod } = trpc.accounting.fiscalPeriods.getCurrent.useQuery();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Sort periods by start date (most recent first)
  const sortedPeriods = React.useMemo(() => {
    if (!periods) return [];
    return [...periods].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [periods]);

  const selectedPeriod = sortedPeriods.find((period) => period.id === value);

  const getStatusBadge = (periodStatus: FiscalPeriodStatus) => {
    switch (periodStatus) {
      case "OPEN":
        return <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 border-green-200">Open</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 border-gray-200">Closed</Badge>;
      case "LOCKED":
        return <Badge variant="outline" className="ml-2 bg-red-100 text-red-700 border-red-200">Locked</Badge>;
    }
  };

  return (
    <Select
      value={value?.toString()}
      onValueChange={(val) => onChange?.(parseInt(val, 10))}
      disabled={disabled || !sortedPeriods || sortedPeriods.length === 0}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedPeriod && (
            <div className="flex items-center justify-between w-full">
              <span>
                {selectedPeriod.periodName}
                <span className="text-muted-foreground text-xs ml-2">
                  ({formatDateRange(selectedPeriod.startDate, selectedPeriod.endDate)})
                </span>
              </span>
              {showStatus && getStatusBadge(selectedPeriod.status)}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {sortedPeriods.map((period) => {
          const isCurrent = currentPeriod?.id === period.id;
          
          return (
            <SelectItem 
              key={period.id} 
              value={period.id.toString()}
              className={cn(isCurrent && "bg-blue-50 font-medium")}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    {period.periodName}
                    {isCurrent && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        Current
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateRange(period.startDate, period.endDate)}
                  </span>
                </div>
                {showStatus && getStatusBadge(period.status)}
              </div>
            </SelectItem>
          );
        })}
        {(!sortedPeriods || sortedPeriods.length === 0) && (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No fiscal periods found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

