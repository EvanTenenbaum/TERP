import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BookmarkIcon, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { InventoryFilters } from "@/hooks/useInventoryFilters";

interface SavedView {
  id: number;
  name: string;
  filters: InventoryFilters;
  createdBy: number | null;
  createdByName: string | null;
  isShared: number;
  createdAt: Date | null;
}

interface SavedViewsDropdownProps {
  onApplyView: (filters: InventoryFilters) => void;
}

export function SavedViewsDropdown({ onApplyView }: SavedViewsDropdownProps) {
  const [deleteViewInfo, setDeleteViewInfo] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const {
    data: views,
    isLoading,
    refetch,
  } = trpc.inventory.views.list.useQuery();
  const deleteView = trpc.inventory.views.delete.useMutation();

  const handleApplyView = (view: SavedView) => {
    onApplyView(view.filters);
    toast.success(`Applied view: ${view.name}`);
  };

  const handleDeleteView = (
    e: React.MouseEvent,
    viewId: number,
    viewName: string
  ) => {
    e.stopPropagation(); // Prevent dropdown from closing
    setDeleteViewInfo({ id: viewId, name: viewName });
  };

  const confirmDeleteView = async () => {
    if (!deleteViewInfo) return;

    try {
      await deleteView.mutateAsync(deleteViewInfo.id);
      toast.success("View deleted");
      refetch();
      setDeleteViewInfo(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete view";
      toast.error(message);
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <BookmarkIcon className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  const viewItems = (views?.items ?? []) as SavedView[];
  const hasViews = viewItems.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Saved Views {hasViews && `(${viewItems.length})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Your Saved Views</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!hasViews ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No saved views yet.
            <br />
            Apply filters and click "Save View" to create one.
          </div>
        ) : (
          <>
            {viewItems.map(view => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleApplyView(view)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <BookmarkIcon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{view.name}</span>
                    {view.isShared === 1 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Shared by {view.createdByName || "Unknown"}
                      </span>
                    )}
                  </div>
                </div>
                {view.isShared === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={e => handleDeleteView(e, view.id, view.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>

      <ConfirmDialog
        open={!!deleteViewInfo}
        onOpenChange={open => !open && setDeleteViewInfo(null)}
        title="Delete View"
        description={`Are you sure you want to delete the view "${deleteViewInfo?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteView}
        isLoading={deleteView.isPending}
      />
    </DropdownMenu>
  );
}
