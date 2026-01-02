/**
 * DraftControls Component
 * Controls for saving and loading sales sheet drafts
 * QA-062: Draft functionality with auto-save indicator
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, FolderOpen, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DraftControlsProps {
  draftName: string;
  onDraftNameChange: (name: string) => void;
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  currentDraftId: number | null;
  onSaveDraft: () => void;
  onLoadDraft: () => void;
  isSaving: boolean;
  disabled: boolean;
}

export const DraftControls = React.memo(function DraftControls({
  draftName,
  onDraftNameChange,
  hasUnsavedChanges,
  lastSaveTime,
  currentDraftId,
  onSaveDraft,
  onLoadDraft,
  isSaving,
  disabled,
}: DraftControlsProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex-1 min-w-0">
        <Input
          placeholder="Draft name..."
          value={draftName}
          onChange={(e) => onDraftNameChange(e.target.value)}
          className="h-9"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Auto-save status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[100px]">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              <span>Saving...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600">Unsaved</span>
            </>
          ) : lastSaveTime ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-600">
                Saved {formatDistanceToNow(lastSaveTime, { addSuffix: true })}
              </span>
            </>
          ) : null}
        </div>

        {currentDraftId && (
          <Badge variant="secondary" className="text-xs">
            Draft #{currentDraftId}
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onLoadDraft}
          disabled={disabled}
        >
          <FolderOpen className="h-4 w-4 mr-1" />
          Load
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onSaveDraft}
          disabled={disabled || isSaving || !draftName.trim()}
        >
          <Save className="h-4 w-4 mr-1" />
          {currentDraftId ? "Update" : "Save"} Draft
        </Button>
      </div>
    </div>
  );
});
