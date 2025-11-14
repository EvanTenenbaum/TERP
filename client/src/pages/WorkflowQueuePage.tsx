/**
 * Workflow Queue Management Page
 * 
 * Kanban-style workflow queue management system for batch processing.
 * Features drag-and-drop, real-time updates, and status history tracking.
 * 
 * Initiative: 1.3 Workflow Queue Management
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, History, BarChart3 } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { WorkflowBoard } from "@/components/workflow/WorkflowBoard";
import { WorkflowSettings } from "@/components/workflow/WorkflowSettings";
import { WorkflowHistory } from "@/components/workflow/WorkflowHistory";
import { WorkflowAnalytics } from "@/components/workflow/WorkflowAnalytics";
import { toast } from "sonner";

type ViewMode = "board" | "settings" | "history" | "analytics";

export default function WorkflowQueuePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  // Fetch workflow statuses
  const { data: statuses, isLoading: statusesLoading } = trpc.workflowQueue.listStatuses.useQuery();

  // Fetch batches grouped by status
  const { data: queues, isLoading: queuesLoading } = trpc.workflowQueue.getQueues.useQuery();

  const isLoading = statusesLoading || queuesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton label="Back to Dashboard" to="/" />
            <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Queue</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage batch processing workflow and track status changes
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "board" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("board")}
            >
              Board
            </Button>
            <Button
              variant={viewMode === "analytics" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("analytics")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={viewMode === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("history")}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button
              variant={viewMode === "settings" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "board" && (
          <WorkflowBoard statuses={statuses || []} queues={queues || {}} />
        )}
        {viewMode === "settings" && <WorkflowSettings statuses={statuses || []} />}
        {viewMode === "history" && <WorkflowHistory />}
        {viewMode === "analytics" && <WorkflowAnalytics />}
      </div>
    </div>
  );
}
