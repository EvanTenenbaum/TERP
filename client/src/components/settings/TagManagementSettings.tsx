/**
 * FEAT-002: Unified Tag Management Settings
 *
 * Centralized tag management interface for:
 * - Creating and editing tags
 * - Setting colors and categories
 * - Viewing tag usage statistics
 * - Managing tag hierarchies
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag as TagIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ColorTagBadge, TAG_CATEGORY_COLORS, type TagCategory, getCategoryColor } from "../tags/ColorTagBadge";
import { trpc } from "@/lib/trpc";

interface TagFormData {
  name: string;
  category: TagCategory;
  color: string;
  description: string;
}

const DEFAULT_FORM: TagFormData = {
  name: "",
  category: "CUSTOM",
  color: "#6B7280",
  description: "",
};

export function TagManagementSettings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TagFormData>(DEFAULT_FORM);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  // Fetch all tags
  const { data: tags, refetch: refetchTags } = trpc.tags.list.useQuery();
  const { data: tagStats } = trpc.advancedTagFeatures.getUsageStats.useQuery();

  // Mutations
  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => {
      toast.success("Tag created successfully");
      setIsCreateDialogOpen(false);
      setFormData(DEFAULT_FORM);
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });

  const updateTag = trpc.tags.update.useMutation({
    onSuccess: () => {
      toast.success("Tag updated successfully");
      setIsEditDialogOpen(false);
      setEditingTagId(null);
      setFormData(DEFAULT_FORM);
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => {
      toast.success("Tag deleted successfully");
      refetchTags();
    },
    onError: (error) => {
      toast.error(`Failed to delete tag: ${error.message}`);
    },
  });

  const handleCreateTag = () => {
    createTag.mutate({
      name: formData.name,
      standardizedName: formData.name.toLowerCase().replace(/\s+/g, "-"),
      category: formData.category,
      color: formData.color,
      description: formData.description,
    });
  };

  const handleUpdateTag = () => {
    if (!editingTagId) return;

    updateTag.mutate({
      id: editingTagId,
      name: formData.name,
      category: formData.category,
      color: formData.color,
      description: formData.description,
    });
  };

  const handleEditClick = (tag: any) => {
    setEditingTagId(tag.id);
    setFormData({
      name: tag.name,
      category: tag.category || "CUSTOM",
      color: tag.color || "#6B7280",
      description: tag.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (tagId: number) => {
    if (confirm("Are you sure you want to delete this tag? This will remove it from all tagged items.")) {
      deleteTag.mutate({ id: tagId });
    }
  };

  const handleCategoryChange = (category: TagCategory) => {
    setFormData({
      ...formData,
      category,
      // Auto-set color based on category if using default color
      color: formData.color === DEFAULT_FORM.color ? getCategoryColor(category) : formData.color,
    });
  };

  // Get usage count for a tag
  const getTagUsageCount = (tagId: number): number => {
    const stat = tagStats?.find((s) => s.tagId === tagId);
    return stat?.productCount || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tag Management</h2>
          <p className="text-muted-foreground">
            Manage tags for products and clients
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag for categorizing products and clients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name *</Label>
                <Input
                  id="tag-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Premium, VIP, High Priority"
                />
              </div>
              <div>
                <Label htmlFor="tag-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleCategoryChange(value as TagCategory)}
                >
                  <SelectTrigger id="tag-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STATUS">Status</SelectItem>
                    <SelectItem value="PRIORITY">Priority</SelectItem>
                    <SelectItem value="TYPE">Type</SelectItem>
                    <SelectItem value="STRAIN">Strain</SelectItem>
                    <SelectItem value="FLAVOR">Flavor</SelectItem>
                    <SelectItem value="EFFECT">Effect</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tag-color">Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="tag-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6B7280"
                    className="flex-1"
                  />
                  <ColorTagBadge
                    tag={{
                      id: 0,
                      name: formData.name || "Preview",
                      color: formData.color,
                      category: formData.category,
                    }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tag-description">Description</Label>
                <Textarea
                  id="tag-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this tag's purpose"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setFormData(DEFAULT_FORM);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={!formData.name.trim() || createTag.isPending}
              >
                {createTag.isPending ? "Creating..." : "Create Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Color Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Color Guide</CardTitle>
          <CardDescription>Default colors for tag categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TAG_CATEGORY_COLORS).map(([category, color]) => (
              <ColorTagBadge
                key={category}
                tag={{
                  id: 0,
                  name: category,
                  color: color,
                  category: category as TagCategory,
                }}
                showCategory={false}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Tags</CardTitle>
          <CardDescription>
            {tags?.length || 0} tag{tags?.length !== 1 ? "s" : ""} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tags || tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tags defined yet</p>
              <p className="text-sm">Create your first tag to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <ColorTagBadge tag={{
                          id: tag.id,
                          name: tag.name,
                          color: tag.color ?? undefined,
                          category: tag.category ?? undefined,
                          description: tag.description ?? undefined,
                        }} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tag.category || "CUSTOM"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tag.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getTagUsageCount(tag.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(tag)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(tag.id)}
                            disabled={getTagUsageCount(tag.id) > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update tag properties and appearance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-tag-name">Tag Name *</Label>
              <Input
                id="edit-tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium, VIP, High Priority"
              />
            </div>
            <div>
              <Label htmlFor="edit-tag-category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as TagCategory })}
              >
                <SelectTrigger id="edit-tag-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STATUS">Status</SelectItem>
                  <SelectItem value="PRIORITY">Priority</SelectItem>
                  <SelectItem value="TYPE">Type</SelectItem>
                  <SelectItem value="STRAIN">Strain</SelectItem>
                  <SelectItem value="FLAVOR">Flavor</SelectItem>
                  <SelectItem value="EFFECT">Effect</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-tag-color">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="edit-tag-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6B7280"
                  className="flex-1"
                />
                <ColorTagBadge
                  tag={{
                    id: 0,
                    name: formData.name || "Preview",
                    color: formData.color,
                    category: formData.category,
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-tag-description">Description</Label>
              <Textarea
                id="edit-tag-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this tag's purpose"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTagId(null);
                setFormData(DEFAULT_FORM);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTag}
              disabled={!formData.name.trim() || updateTag.isPending}
            >
              {updateTag.isPending ? "Updating..." : "Update Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
