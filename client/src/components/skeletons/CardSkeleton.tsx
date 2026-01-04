import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardSkeletonProps {
  lines?: number;
  showHeader?: boolean;
  className?: string;
}

export const CardSkeleton = React.memo(function CardSkeleton({
  lines = 3,
  showHeader = true,
  className,
}: CardSkeletonProps) {
  return (
    <Card
      className={cn("w-full overflow-hidden", className)}
      data-testid="card-skeleton"
    >
      {showHeader && (
        <CardHeader className="pb-2" data-testid="card-skeleton-header">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16 mt-2" />
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
              key={`line-${index}`}
              className="h-3 w-full"
              data-testid="card-skeleton-line"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
