import React from "react";
import { CardSkeleton } from "./CardSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface DashboardSkeletonProps {
  cards?: number;
}

export const DashboardSkeleton = React.memo(function DashboardSkeleton({
  cards = 4,
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <CardSkeleton key={index} lines={2} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full rounded-lg bg-muted animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-28" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} columns={6} />
        </CardContent>
      </Card>
    </div>
  );
});
