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
import { Clock, FileArchive, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SavedSheetInfo } from "./types";

interface SavedSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedSheets: SavedSheetInfo[];
  isLoading: boolean;
  onLoadSavedSheet: (sheetId: number) => void;
}

export const SavedSheetsDialog = React.memo(function SavedSheetsDialog({
  open,
  onOpenChange,
  savedSheets,
  isLoading,
  onLoadSavedSheet,
}: SavedSheetsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Load Saved Sheet
          </DialogTitle>
          <DialogDescription>
            Reopen a saved sales catalogue for this client.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : savedSheets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved sheets found</p>
            <p className="text-sm mt-1">
              Save a sheet from the preview to reopen it here later.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-2 pr-4">
              {savedSheets.map(sheet => (
                <Button
                  key={sheet.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start p-3 text-left"
                  onClick={() => onLoadSavedSheet(sheet.id)}
                >
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        Saved Sheet #{sheet.id}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${Number(sheet.totalValue || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {sheet.itemCount} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sheet.createdAt
                          ? formatDistanceToNow(new Date(sheet.createdAt), {
                              addSuffix: true,
                            })
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
});
