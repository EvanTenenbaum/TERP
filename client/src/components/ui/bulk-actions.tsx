/**
 * Generic Bulk Actions Component
 * ENH-002: Reusable bulk actions bar for data tables
 */

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { X, Trash2, Download, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Types
export interface BulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  actions?: BulkAction[];
  onAction?: (actionId: string) => void;
  statusOptions?: StatusOption[];
  onStatusChange?: (status: string) => void;
  onExport?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  actions = [],
  onAction,
  statusOptions,
  onStatusChange,
  onExport,
  onDelete,
  className,
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  if (selectedCount === 0) return null;

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    onStatusChange?.(value);
  };

  const handleAction = (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      onAction?.(action.id);
    }
  };

  const confirmPendingAction = () => {
    if (confirmAction) {
      onAction?.(confirmAction.id);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200",
          className
        )}
      >
        <div className="bg-background rounded-lg shadow-lg border p-4 flex items-center gap-4">
          {/* Selected count */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} of {totalCount} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            {onSelectAll && selectedCount < totalCount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-8 text-xs"
              >
                Select all {totalCount}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border" />

          {/* Status change dropdown */}
          {statusOptions && statusOptions.length > 0 && onStatusChange && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select
                  value={selectedStatus}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="h-8 w-px bg-border" />
            </>
          )}

          {/* Export button */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
          )}

          {/* Custom actions */}
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map(action => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className={
                      action.variant === "destructive" ? "text-destructive" : ""
                    }
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                setConfirmAction({
                  id: "delete",
                  label: "Delete",
                  requiresConfirmation: true,
                  confirmationTitle: "Delete Selected Items",
                  confirmationMessage: `Are you sure you want to delete ${selectedCount} selected item${selectedCount > 1 ? "s" : ""}? This action cannot be undone.`,
                })
              }
              className="h-9"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={open => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmationTitle || "Confirm Action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmationMessage ||
                `Are you sure you want to perform this action on ${selectedCount} item${selectedCount > 1 ? "s" : ""}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              className={
                confirmAction?.variant === "destructive" ||
                confirmAction?.id === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Checkbox cell component for tables
export interface SelectAllCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SelectAllCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
}: SelectAllCheckboxProps) {
  return (
    <Checkbox
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={onCheckedChange}
      aria-label="Select all"
    />
  );
}

export interface SelectRowCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SelectRowCheckbox({
  checked,
  onCheckedChange,
  disabled,
}: SelectRowCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label="Select row"
      onClick={e => e.stopPropagation()}
    />
  );
}

// Hook for managing table selection
export function useTableSelection<T extends { id: number | string }>(
  items: T[]
) {
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(
    new Set()
  );

  const isSelected = (id: number | string) => selectedIds.has(id);

  const toggleSelection = (id: number | string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const selectedItems = items.filter(item => selectedIds.has(item.id));

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectAll,
    isAllSelected: items.length > 0 && selectedIds.size === items.length,
    isIndeterminate: selectedIds.size > 0 && selectedIds.size < items.length,
  };
}
