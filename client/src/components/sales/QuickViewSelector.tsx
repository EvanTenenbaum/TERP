/**
 * QuickViewSelector Component
 * Dropdown for quickly loading saved views for a client
 * SALES-SHEET-IMPROVEMENTS: New component for saved views functionality
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap,
  Star,
  Clock,
  ChevronDown,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { InventoryFilters, InventorySortConfig, ColumnVisibility } from "./types";

interface QuickViewSelectorProps {
  clientId: number;
  onLoadView: (view: {
    filters: InventoryFilters;
    sort: InventorySortConfig;
    columnVisibility: ColumnVisibility;
  }) => void;
  currentViewId?: number | null;
}

export function QuickViewSelector({
  clientId,
  onLoadView,
  currentViewId,
}: QuickViewSelectorProps) {
  const utils = trpc.useUtils();
  
  // BUG-007: State for delete confirmation dialog (replaces window.confirm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<number | null>(null);

  // Fetch saved views for this client
  const { data: views, isLoading } = trpc.salesSheets.getViews.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  // Delete view mutation
  const deleteViewMutation = trpc.salesSheets.deleteView.useMutation({
    onSuccess: () => {
      utils.salesSheets.getViews.invalidate({ clientId });
      toast.success("View deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete view: " + error.message);
    },
  });

  // Set default view mutation
  const setDefaultMutation = trpc.salesSheets.setDefaultView.useMutation({
    onSuccess: () => {
      utils.salesSheets.getViews.invalidate({ clientId });
      toast.success("Default view updated");
    },
    onError: (error) => {
      toast.error("Failed to set default: " + error.message);
    },
  });

  // Separate client-specific and universal views
  const { clientViews, universalViews } = useMemo(() => {
    if (!views) return { clientViews: [], universalViews: [] };
    return {
      clientViews: views.filter((v) => v.clientId === clientId),
      universalViews: views.filter((v) => v.clientId === null),
    };
  }, [views, clientId]);

  const hasViews = clientViews.length > 0 || universalViews.length > 0;

  // Handle loading a view
  const handleLoadView = async (viewId: number) => {
    try {
      const view = await utils.salesSheets.loadView.fetch({ viewId });
      if (view) {
        onLoadView({
          filters: view.filters,
          sort: view.sort as InventorySortConfig,
          columnVisibility: view.columnVisibility,
        });
        toast.success(`Loaded: ${view.name}`);
      }
    } catch (error) {
      toast.error("Failed to load view");
    }
  };

  // Handle setting default
  const handleSetDefault = (e: React.MouseEvent, viewId: number) => {
    e.stopPropagation();
    setDefaultMutation.mutate({ viewId, clientId });
  };

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleDelete = (e: React.MouseEvent, viewId: number) => {
    e.stopPropagation();
    setViewToDelete(viewId);
    setDeleteDialogOpen(true);
  };
  
  // BUG-007: Confirm delete action
  const confirmDelete = () => {
    if (viewToDelete !== null) {
      deleteViewMutation.mutate({ viewId: viewToDelete });
      setViewToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  // Format last used time
  const formatLastUsed = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Zap className="mr-2 h-4 w-4" />
        Quick View
      </Button>
    );
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Quick View
          {hasViews && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {clientViews.length + universalViews.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {!hasViews ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No saved views yet. Create one using the Save View button.
          </div>
        ) : (
          <>
            {/* Client-specific views */}
            {clientViews.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  Client Views
                </DropdownMenuLabel>
                {clientViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={() => handleLoadView(view.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {view.isDefault && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      {currentViewId === view.id && (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                      <span className="truncate">{view.name}</span>
                      {view.lastUsedAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatLastUsed(view.lastUsedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {!view.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleSetDefault(e, view.id)}
                          title="Set as default"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => handleDelete(e, view.id)}
                        title="Delete view"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Universal views */}
            {universalViews.length > 0 && (
              <>
                {clientViews.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-muted-foreground">
                  Universal Views
                </DropdownMenuLabel>
                {universalViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={() => handleLoadView(view.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {currentViewId === view.id && (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                      <span className="truncate">{view.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive ml-2 flex-shrink-0"
                      onClick={(e) => handleDelete(e, view.id)}
                      title="Delete view"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    
    {/* BUG-007: Delete Confirmation Dialog (replaces window.confirm) */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Saved View?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your saved view.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setViewToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
