import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Table skeleton for data tables
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

const TableSkeleton = React.memo(function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn("h-4", colIndex === 0 ? "w-24" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

/**
 * Card skeleton for card-based layouts
 */
interface CardSkeletonProps {
  showImage?: boolean;
  showFooter?: boolean;
  className?: string;
}

const CardSkeleton = React.memo(function CardSkeleton({
  showImage = false,
  showFooter = false,
  className,
}: CardSkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {showImage && <Skeleton className="h-32 w-full rounded-md" />}
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      {showFooter && (
        <div className="flex justify-between pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  );
});

/**
 * Grid of cards skeleton
 */
interface GridSkeletonProps {
  items?: number;
  columns?: number;
  showImage?: boolean;
  className?: string;
}

const GridSkeleton = React.memo(function GridSkeleton({
  items = 6,
  columns = 3,
  showImage = false,
  className,
}: GridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} showImage={showImage} />
      ))}
    </div>
  );
});

/**
 * Form skeleton for form loading states
 */
interface FormSkeletonProps {
  fields?: number;
  showSubmit?: boolean;
  className?: string;
}

const FormSkeleton = React.memo(function FormSkeleton({
  fields = 4,
  showSubmit = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
});

/**
 * Stats/KPI skeleton
 */
interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

const StatsSkeleton = React.memo(function StatsSkeleton({
  count = 4,
  className,
}: StatsSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
});

/**
 * List skeleton for list views
 */
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

const ListSkeleton = React.memo(function ListSkeleton({
  items = 5,
  showAvatar = false,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
});

/**
 * Detail page skeleton
 */
interface DetailSkeletonProps {
  className?: string;
}

const DetailSkeleton = React.memo(function DetailSkeleton({
  className,
}: DetailSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats */}
      <StatsSkeleton count={4} />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
        <div>
          <CardSkeleton showFooter />
        </div>
      </div>
    </div>
  );
});

/**
 * Chart skeleton
 */
interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

const ChartSkeleton = React.memo(function ChartSkeleton({
  height = 300,
  className,
}: ChartSkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="w-full rounded" style={{ height }} />
    </div>
  );
});

/**
 * Drawer/Sheet content skeleton
 */
interface DrawerSkeletonProps {
  sections?: number;
  className?: string;
}

const DrawerSkeleton = React.memo(function DrawerSkeleton({
  sections = 4,
  className,
}: DrawerSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      {/* Sections */}
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  );
});

export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  GridSkeleton,
  FormSkeleton,
  StatsSkeleton,
  ListSkeleton,
  DetailSkeleton,
  ChartSkeleton,
  DrawerSkeleton,
};
