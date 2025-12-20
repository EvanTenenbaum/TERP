/**
 * ResponsiveTable Component
 * BUG-M003: Mobile-friendly tables that render as cards on mobile
 * 
 * On desktop (≥768px): Renders as a standard table
 * On mobile (<768px): Renders as stacked cards with key-value pairs
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', label: 'Name', priority: 'primary' },
 *     { key: 'email', label: 'Email', priority: 'secondary' },
 *     { key: 'status', label: 'Status', priority: 'primary', render: (value) => <Badge>{value}</Badge> },
 *   ]}
 *   data={clients}
 *   onRowClick={(row) => navigate(`/clients/${row.id}`)}
 *   emptyMessage="No clients found"
 * />
 * ```
 */

import React from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export interface ResponsiveTableColumn<T> {
  /** Unique key for the column, should match a property in the data */
  key: keyof T | string;
  /** Display label for the column header */
  label: string;
  /** Priority determines visibility on mobile: 'primary' always shown, 'secondary' shown in expanded view */
  priority?: "primary" | "secondary";
  /** Custom render function for the cell value */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Additional className for the cell */
  className?: string;
  /** Alignment for the cell content */
  align?: "left" | "center" | "right";
  /** Whether this column should be hidden on mobile card view */
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T extends Record<string, unknown>> {
  /** Column definitions */
  columns: ResponsiveTableColumn<T>[];
  /** Data array to display */
  data: T[];
  /** Callback when a row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Message to display when data is empty */
  emptyMessage?: string;
  /** Key extractor for unique row keys */
  keyExtractor?: (row: T, index: number) => string | number;
  /** Additional className for the container */
  className?: string;
  /** Whether to show a loading state */
  isLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Whether rows are clickable (shows chevron on mobile) */
  clickable?: boolean;
}

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found",
  keyExtractor = (_, index) => index,
  className,
  isLoading = false,
  loadingComponent,
  clickable = true,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return loadingComponent || <TableLoadingSkeleton columns={columns.length} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile: Render as cards
  if (isMobile) {
    const primaryColumns = columns.filter(
      (col) => col.priority === "primary" && !col.hideOnMobile
    );
    const secondaryColumns = columns.filter(
      (col) => col.priority !== "primary" && !col.hideOnMobile
    );

    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, index) => {
          const key = keyExtractor(row, index);
          const isClickable = clickable && onRowClick;

          return (
            <Card
              key={key}
              className={cn(
                "overflow-hidden transition-colors",
                isClickable && "cursor-pointer hover:bg-accent/50 active:bg-accent"
              )}
              onClick={() => isClickable && onRowClick(row, index)}
            >
              <CardContent className="p-4">
                {/* Primary info - always visible, larger text */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    {primaryColumns.map((col) => {
                      const value = getNestedValue(row, col.key as string);
                      const rendered = col.render
                        ? col.render(value, row, index)
                        : String(value ?? "-");

                      return (
                        <div
                          key={String(col.key)}
                          className={cn(
                            "text-sm",
                            col.className
                          )}
                        >
                          {rendered}
                        </div>
                      );
                    })}
                  </div>
                  {isClickable && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Secondary info - smaller text, key-value pairs */}
                {secondaryColumns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {secondaryColumns.map((col) => {
                      const value = getNestedValue(row, col.key as string);
                      const rendered = col.render
                        ? col.render(value, row, index)
                        : String(value ?? "-");

                      return (
                        <div
                          key={String(col.key)}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-muted-foreground shrink-0">
                            {col.label}
                          </span>
                          <span
                            className={cn(
                              "text-right truncate",
                              col.className
                            )}
                          >
                            {rendered}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: Render as standard table
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                className={cn(
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => {
            const key = keyExtractor(row, index);
            const isClickable = clickable && onRowClick;

            return (
              <TableRow
                key={key}
                className={cn(
                  isClickable && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => isClickable && onRowClick(row, index)}
              >
                {columns.map((col) => {
                  const value = getNestedValue(row, col.key as string);
                  const rendered = col.render
                    ? col.render(value, row, index)
                    : String(value ?? "-");

                  return (
                    <TableCell
                      key={String(col.key)}
                      className={cn(
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {rendered}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Simple loading skeleton for the table */
function TableLoadingSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 bg-muted/50 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

export default ResponsiveTable;
