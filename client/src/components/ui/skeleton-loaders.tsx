/**
 * Skeleton Loader Components
 * UX-011: Add Skeleton Loaders
 * 
 * Reusable skeleton components for loading states that match the UI structure.
 * These provide visual feedback during data fetching.
 * 
 * @example
 * ```tsx
 * {isLoading ? <TableSkeleton rows={5} columns={4} /> : <DataTable data={data} />}
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ============================================================================
// BASE SKELETON COMPONENTS
// ============================================================================

export interface SkeletonTextProps {
  /** Width of the skeleton (can be percentage or fixed) */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Text line skeleton
 */
export const SkeletonText = React.memo(function SkeletonText({
  width = "100%",
  height = "1rem",
  className,
}: SkeletonTextProps) {
  return (
    <Skeleton
      className={cn("rounded", className)}
      style={{ width, height }}
    />
  );
});

// ============================================================================
// TABLE SKELETON
// ============================================================================

export interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Whether to show header row */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Table skeleton for data tables
 */
export const TableSkeleton = React.memo(function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={`sk-header-${i}`}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? "200px" : "150px" }}
            />
          ))}
        </div>
      )}
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={`sk-row-${rowIndex}`}
          className="flex gap-4 p-4 border-b last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={`sk-cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
              style={{ 
                maxWidth: colIndex === 0 ? "200px" : "150px",
                // Vary widths slightly for more natural look
                width: `${70 + Math.random() * 30}%`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// CARD SKELETON
// ============================================================================

export interface CardSkeletonProps {
  /** Whether to show header */
  showHeader?: boolean;
  /** Number of content lines */
  lines?: number;
  /** Whether to show action button */
  showAction?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card skeleton for card-based layouts
 */
export const CardSkeleton = React.memo(function CardSkeleton({
  showHeader = true,
  lines = 3,
  showAction = false,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2 mt-1" />
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={`sk-line-${i}`}
              className="h-4"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
        {showAction && (
          <Skeleton className="h-9 w-24 mt-4" />
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// WIDGET SKELETON
// ============================================================================

export interface WidgetSkeletonProps {
  /** Widget variant */
  variant?: "metric" | "chart" | "list" | "leaderboard";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Widget skeleton for dashboard widgets
 */
export const WidgetSkeleton = React.memo(function WidgetSkeleton({
  variant = "metric",
  className,
}: WidgetSkeletonProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        {variant === "metric" && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        )}
        
        {variant === "chart" && (
          <div className="space-y-2">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}
        
        {variant === "list" && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`sk-line-${i}`} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {variant === "leaderboard" && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`sk-line-${i}`} className="flex items-center gap-3 py-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// LIST SKELETON
// ============================================================================

export interface ListSkeletonProps {
  /** Number of items */
  items?: number;
  /** Whether to show avatar/icon */
  showAvatar?: boolean;
  /** Whether to show secondary text */
  showSecondary?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * List skeleton for list views
 */
export const ListSkeleton = React.memo(function ListSkeleton({
  items = 5,
  showAvatar = true,
  showSecondary = true,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`sk-line-${i}`} className="flex items-center gap-4 p-2">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            {showSecondary && <Skeleton className="h-3 w-1/2" />}
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// PAGE SKELETON
// ============================================================================

export interface PageSkeletonProps {
  /** Page variant */
  variant?: "table" | "cards" | "dashboard";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full page skeleton for page-level loading states
 */
export const PageSkeleton = React.memo(function PageSkeleton({
  variant = "table",
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters/search bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Content */}
      {variant === "table" && (
        <Card>
          <TableSkeleton rows={10} columns={6} />
        </Card>
      )}

      {variant === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <CardSkeleton key={`sk-line-${i}`} lines={4} showAction />
          ))}
        </div>
      )}

      {variant === "dashboard" && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <WidgetSkeleton key={`sk-line-${i}`} variant="metric" />
            ))}
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WidgetSkeleton variant="chart" />
            <WidgetSkeleton variant="leaderboard" />
          </div>
        </>
      )}
    </div>
  );
});

// ============================================================================
// FORM SKELETON
// ============================================================================

export interface FormSkeletonProps {
  /** Number of fields */
  fields?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Form skeleton for form loading states
 */
export const FormSkeleton = React.memo(function FormSkeleton({
  fields = 4,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={`sk-line-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
});

export default {
  SkeletonText,
  TableSkeleton,
  CardSkeleton,
  WidgetSkeleton,
  ListSkeleton,
  PageSkeleton,
  FormSkeleton,
};
