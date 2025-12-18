/**
 * Workflow Analytics Component
 * 
 * Displays analytics and metrics for the workflow queue system.
 * Shows throughput, bottlenecks, and average time in each status.
 */

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, Clock, TrendingUp, AlertCircle, LineChart } from "lucide-react";

export function WorkflowAnalytics() {
  const { data: statuses } = trpc.workflowQueue.listStatuses.useQuery();
  const { data: queues } = trpc.workflowQueue.getQueues.useQuery();

  // Calculate metrics
  const totalBatches = queues
    ? Object.values(queues).reduce((sum, batches) => sum + batches.length, 0)
    : 0;

  const statusCounts = statuses?.map((status) => ({
    status: status.name,
    count: queues?.[status.id]?.length || 0,
    color: status.color,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Analytics</h2>
        <p className="text-sm text-gray-600">
          Monitor workflow performance and identify bottlenecks
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Batches</div>
              <div className="text-2xl font-bold">{totalBatches}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Statuses</div>
              <div className="text-2xl font-bold">{statuses?.length || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg. Time</div>
              <div className="text-2xl font-bold">-</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Bottlenecks</div>
              <div className="text-2xl font-bold">-</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Status Distribution</h3>
        <div className="space-y-4">
          {statusCounts?.map((item) => (
            <div key={item.status}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{item.status}</span>
                <span className="text-sm text-gray-600">{item.count} batches</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${totalBatches > 0 ? (item.count / totalBatches) * 100 : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Advanced analytics - in development */}
      <Alert className="mt-6 bg-muted/50">
        <LineChart className="h-4 w-4" />
        <AlertTitle>Advanced Analytics In Development</AlertTitle>
        <AlertDescription>
          Time-series charts showing average time per status, throughput trends, and bottleneck
          analysis are being developed. The current distribution overview above provides a real-time
          snapshot of your workflow queue status.
        </AlertDescription>
      </Alert>
    </div>
  );
}
