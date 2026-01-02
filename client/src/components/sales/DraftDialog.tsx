/**
 * DraftDialog Component
 * Dialog for loading and managing sales sheet drafts
 * QA-062: Draft functionality
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText, Clock, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DraftInfo } from "./types";

interface DraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: DraftInfo[];
  isLoading: boolean;
  onLoadDraft: (draftId: number) => void;
  onDeleteDraft: (draftId: number) => void;
  isDeleting: boolean;
}

export const DraftDialog = React.memo(function DraftDialog({
  open,
  onOpenChange,
  drafts,
  isLoading,
  onLoadDraft,
  onDeleteDraft,
  isDeleting,
}: DraftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Load Draft
          </DialogTitle>
          <DialogDescription>
            Select a draft to continue working on
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No drafts found</p>
            <p className="text-sm mt-1">
              Start creating a sales sheet and save it as a draft
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => onLoadDraft(draft.id)}
                  >
                    <p className="font-medium truncate">{draft.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {draft.itemCount} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {draft.updatedAt
                          ? formatDistanceToNow(new Date(draft.updatedAt), {
                              addSuffix: true,
                            })
                          : "Unknown"}
                      </span>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDraft(draft.id);
                    }}
                    disabled={isDeleting}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
});
