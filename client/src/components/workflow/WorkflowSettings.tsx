/**
 * Workflow Settings Component
 * 
 * Manage workflow statuses: create, edit, delete, and reorder.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, GripVertical, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface WorkflowSettingsProps {
  statuses: Array<{
    id: number;
    name: string;
    slug: string;
    color: string;
    order: number;
  }>;
}

export function WorkflowSettings({ statuses }: WorkflowSettingsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [deleteStatusId, setDeleteStatusId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color: "#3B82F6",
  });

  const utils = trpc.useUtils();

  // Mutations
  const createStatus = trpc.workflowQueue.createStatus.useMutation({
    onSuccess: () => {
      toast.success("Workflow status created successfully");
      utils.workflowQueue.listStatuses.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create status: ${error.message}`);
    },
  });

  const updateStatus = trpc.workflowQueue.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Workflow status updated successfully");
      utils.workflowQueue.listStatuses.invalidate();
      setEditingStatus(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const deleteStatus = trpc.workflowQueue.deleteStatus.useMutation({
    onSuccess: () => {
      toast.success("Workflow status deleted successfully");
      utils.workflowQueue.listStatuses.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      color: "#3B82F6",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    createStatus.mutate({
      name: formData.name,
      slug: formData.slug,
      color: formData.color,
      order: statuses.length + 1,
    });
  };

  const handleUpdate = () => {
    if (!editingStatus) return;

    updateStatus.mutate({
      id: editingStatus,
      name: formData.name,
      color: formData.color,
    });
  };

  const handleEdit = (status: any) => {
    setEditingStatus(status.id);
    setFormData({
      name: status.name,
      slug: status.slug,
      color: status.color,
    });
  };

  const handleDelete = (id: number) => {
    setDeleteStatusId(id);
  };

  const confirmDelete = () => {
    if (deleteStatusId) {
      deleteStatus.mutate({ id: deleteStatusId });
      setDeleteStatusId(null);
    }
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage workflow statuses and their order
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Status
        </Button>
      </div>

      {/* Status List */}
      <div className="space-y-3">
        {sortedStatuses.map((status) => (
          <Card key={status.id} className="p-4">
            {editingStatus === status.id ? (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingStatus(null);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <div className="font-medium">{status.name}</div>
                    <div className="text-sm text-gray-500">{status.slug}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(status)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(status.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow Status</DialogTitle>
            <DialogDescription>
              Add a new status to the workflow queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lab Testing"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., lab-testing"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteStatusId}
        onOpenChange={(open) => !open && setDeleteStatusId(null)}
        title="Delete Workflow Status"
        description="Are you sure you want to delete this workflow status? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteStatus.isPending}
      />
    </div>
  );
}
