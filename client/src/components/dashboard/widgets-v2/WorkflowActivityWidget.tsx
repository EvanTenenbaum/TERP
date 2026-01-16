import { memo } from "react";
/**
 * Workflow Recent Activity Widget
 *
 * Displays recent batch status changes with visual transition indicators.
 * Shows the most recent workflow activity across all batches.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, History, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export const WorkflowActivityWidget = memo(function WorkflowActivityWidget() {
  const [, setLocation] = useLocation();

  const { data: recentChanges, isLoading: changesLoading } =
    trpc.workflowQueue.getRecentChanges.useQuery({
      limit: 5,
    });

  const { data: statuses, isLoading: statusesLoading } =
    trpc.workflowQueue.listStatuses.useQuery();

  const isLoading = changesLoading || statusesLoading;

  const getStatusById = (id: number | null) => {
    if (!id || !statuses) return null;
    return statuses.find(s => s.id === id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-purple-600" />
          Recent Workflow Activity
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/workflow-queue?view=history")}
          className="text-xs"
        >
          View All
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !recentChanges || recentChanges.length === 0 ? (
          <EmptyState
            variant="generic"
            size="sm"
            title="No recent activity"
            description="Workflow activity will appear once batch statuses change"
          />
        ) : (
          <div className="space-y-3">
            {recentChanges.map(change => {
              const fromStatus = getStatusById(change.fromStatusId);
              const toStatus = getStatusById(change.toStatusId);

              return (
                <div
                  key={change.id}
                  className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setLocation("/workflow-queue?view=history")}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Batch #{change.batchId}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(change.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {fromStatus && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: `${fromStatus.color}15`,
                          borderColor: fromStatus.color,
                          color: fromStatus.color,
                        }}
                      >
                        {fromStatus.name}
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    {toStatus && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: `${toStatus.color}15`,
                          borderColor: toStatus.color,
                          color: toStatus.color,
                        }}
                      >
                        {toStatus.name}
                      </Badge>
                    )}
                  </div>

                  {change.notes && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {change.notes}
                    </p>
                  )}
                </div>
              );
            })}

            {/* View All Button */}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setLocation("/workflow-queue?view=history")}
            >
              <History className="h-4 w-4 mr-2" />
              View Complete History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
