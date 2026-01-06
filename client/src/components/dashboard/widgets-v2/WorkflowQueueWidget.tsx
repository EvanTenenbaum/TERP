import { memo } from "react";
/**
 * Workflow Queue Summary Widget
 *
 * Displays batch counts by workflow status with quick navigation to the full board.
 * Shows color-coded status indicators and total batch count.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export const WorkflowQueueWidget = memo(function WorkflowQueueWidget() {
  const [, setLocation] = useLocation();

  const { data: statuses, isLoading: statusesLoading } =
    trpc.workflowQueue.listStatuses.useQuery();
  const { data: queues, isLoading: queuesLoading } =
    trpc.workflowQueue.getQueues.useQuery();

  const isLoading = statusesLoading || queuesLoading;

  // Calculate total batches
  const totalBatches = queues
    ? Object.values(queues).reduce((sum, batches) => sum + batches.length, 0)
    : 0;

  // Sort statuses by order
  const sortedStatuses = statuses
    ? [...statuses].sort((a, b) => a.order - b.order)
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          Workflow Queue
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/workflow-queue")}
          className="text-xs"
        >
          View Board
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : sortedStatuses.length === 0 ? (
          <EmptyState
            variant="generic"
            size="sm"
            title="No workflow statuses"
            description="Configure workflow statuses to track batch progress"
            action={{
              label: "Configure Workflow",
              onClick: () => setLocation("/workflow-queue?view=settings"),
            }}
          />
        ) : (
          <div className="space-y-3">
            {/* Total Summary */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="font-semibold text-blue-900">
                Total Batches in Queue
              </span>
              <Badge
                variant="secondary"
                className="text-lg font-bold bg-blue-600 text-white"
              >
                {totalBatches}
              </Badge>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-2">
              {sortedStatuses.map(status => {
                const batchCount = queues?.[status.id]?.length || 0;

                return (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setLocation("/workflow-queue")}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm font-medium truncate">
                        {status.name}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${status.color}15`,
                        borderColor: status.color,
                        color: status.color,
                      }}
                    >
                      {batchCount}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Quick Action */}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setLocation("/workflow-queue")}
            >
              <Layers className="h-4 w-4 mr-2" />
              Open Workflow Board
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
