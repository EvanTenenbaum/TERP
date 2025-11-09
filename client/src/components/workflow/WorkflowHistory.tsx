/**
 * Workflow History Component
 * 
 * Displays recent status changes across all batches with filtering.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export function WorkflowHistory() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: recentChanges, isLoading } = trpc.workflowQueue.getRecentChanges.useQuery({
    limit: 100,
  });

  const { data: statuses } = trpc.workflowQueue.listStatuses.useQuery();

  const getStatusById = (id: number | null) => {
    if (!id || !statuses) return null;
    return statuses.find((s) => s.id === id);
  };

  const filteredChanges = recentChanges?.filter((change) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      change.batchId.toString().includes(query) ||
      change.notes?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Change History</h2>
        <p className="text-sm text-gray-600">
          Track all batch status changes across the workflow
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by batch ID or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredChanges && filteredChanges.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No status changes found
          </Card>
        ) : (
          filteredChanges?.map((change) => {
            const fromStatus = getStatusById(change.fromStatusId);
            const toStatus = getStatusById(change.toStatusId);

            return (
              <Card key={change.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">Batch #{change.batchId}</span>
                      <div className="flex items-center gap-2">
                        {fromStatus && (
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${fromStatus.color}20`,
                              color: fromStatus.color,
                              borderColor: fromStatus.color,
                            }}
                          >
                            {fromStatus.name}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        {toStatus && (
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${toStatus.color}20`,
                              color: toStatus.color,
                              borderColor: toStatus.color,
                            }}
                          >
                            {toStatus.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {change.notes && (
                      <p className="text-sm text-gray-600 mb-2">{change.notes}</p>
                    )}
                    <div className="text-xs text-gray-400">
                      {format(new Date(change.createdAt), "PPpp")} (
                      {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })})
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
