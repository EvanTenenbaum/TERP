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
import { Button } from "@/components/ui/button";
import { Settings, History, BarChart3, Plus } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { WorkflowBoard } from "@/components/workflow/WorkflowBoard";
import { WorkflowSettings } from "@/components/workflow/WorkflowSettings";
import { WorkflowHistory } from "@/components/workflow/WorkflowHistory";
import { WorkflowAnalytics } from "@/components/workflow/WorkflowAnalytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type ViewMode = "board" | "settings" | "history" | "analytics";

export default function WorkflowQueuePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set());
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);

  // Fetch workflow statuses
  const { data: statuses, isLoading: statusesLoading } =
    trpc.workflowQueue.listStatuses.useQuery();

  // Fetch batches grouped by status
  const { data: queues, isLoading: queuesLoading, refetch: refetchQueues } =
    trpc.workflowQueue.getQueues.useQuery();

  // Fetch batches not in queue
  const { data: batchesNotInQueue, isLoading: batchesLoading } =
    trpc.workflowQueue.getBatchesNotInQueue.useQuery(
      { limit: 50, query: batchSearch || undefined },
      { enabled: isAddDialogOpen }
    );

  // Add batches to queue mutation
  const addBatchesMutation = trpc.workflowQueue.addBatchesToQueue.useMutation({
    onSuccess: (data) => {
      toast.success(`Added ${data.added} batch(es) to workflow queue`);
      setIsAddDialogOpen(false);
      setSelectedBatchIds(new Set());
      setSelectedStatusId(null);
      setBatchSearch("");
      refetchQueues();
    },
    onError: (error) => {
      toast.error(`Failed to add batches: ${error.message}`);
    },
  });

  const isLoading = statusesLoading || queuesLoading;

  const handleToggleBatch = (batchId: number) => {
    const newSelected = new Set(selectedBatchIds);
    if (newSelected.has(batchId)) {
      newSelected.delete(batchId);
    } else {
      newSelected.add(batchId);
    }
    setSelectedBatchIds(newSelected);
  };

  const handleAddToQueue = () => {
    if (selectedBatchIds.size === 0) {
      toast.error("Please select at least one batch");
      return;
    }
    if (!selectedStatusId) {
      toast.error("Please select a workflow status");
      return;
    }

    addBatchesMutation.mutate({
      batchIds: Array.from(selectedBatchIds),
      toStatusId: selectedStatusId,
    });
  };

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
              <h1 className="text-2xl font-bold text-gray-900">
                Workflow Queue
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage batch processing workflow and track status changes
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Queue
            </Button>
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
        {viewMode === "settings" && (
          <WorkflowSettings statuses={statuses || []} />
        )}
        {viewMode === "history" && <WorkflowHistory />}
        {viewMode === "analytics" && <WorkflowAnalytics />}
      </div>

      {/* Add to Queue Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Batches to Workflow Queue</DialogTitle>
            <DialogDescription>
              Select batches to add to the workflow queue and choose their initial status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Selection */}
            <div>
              <Label htmlFor="status-select">Initial Workflow Status *</Label>
              <Select
                value={selectedStatusId?.toString() || ""}
                onValueChange={(value) => setSelectedStatusId(parseInt(value))}
              >
                <SelectTrigger id="status-select">
                  <SelectValue placeholder="Select workflow status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses?.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Search */}
            <div>
              <Label htmlFor="batch-search">Search Batches</Label>
              <Input
                id="batch-search"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                placeholder="Search by SKU or product name..."
              />
            </div>

            {/* Batch List */}
            <div>
              <Label>Select Batches ({selectedBatchIds.size} selected)</Label>
              <div className="mt-2 border rounded-lg max-h-96 overflow-y-auto">
                {batchesLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading batches...
                  </div>
                ) : batchesNotInQueue && batchesNotInQueue.length > 0 ? (
                  <div className="divide-y">
                    {batchesNotInQueue.map((batch) => (
                      <div
                        key={batch.id}
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                        onClick={() => handleToggleBatch(batch.id)}
                      >
                        <Checkbox
                          checked={selectedBatchIds.has(batch.id)}
                          onCheckedChange={() => handleToggleBatch(batch.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {batch.sku || `Batch #${batch.id}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {batch.sku || "N/A"} - Qty: {batch.onHandQty || "0"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {batchSearch ? "No batches found matching search" : "All batches are already in the workflow queue"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToQueue}
              disabled={selectedBatchIds.size === 0 || !selectedStatusId || addBatchesMutation.isPending}
            >
              {addBatchesMutation.isPending ? "Adding..." : `Add ${selectedBatchIds.size} Batch(es)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
