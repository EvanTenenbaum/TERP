import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NoteCard } from "@/components/ui/note-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ScratchPadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScratchPad({ open, onOpenChange }: ScratchPadProps) {
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [isAddingNote, setIsAddingNote] = React.useState(false);

  // Queries
  const {
    data: notesData,
    isLoading,
    refetch,
  } = trpc.scratchPad.list.useQuery(
    { limit: 50 },
    { enabled: open }
  );

  // Mutations
  const createNoteMutation = trpc.scratchPad.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewNoteContent("");
      setIsAddingNote(false);
      toast.success("Note added");
    },
    onError: (error: unknown) => {
      toast.error(`Failed to add note: ${(error as Error).message}`);
    },
  });

  const updateNoteMutation = trpc.scratchPad.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Note updated");
    },
    onError: (error: unknown) => {
      toast.error(`Failed to update note: ${(error as Error).message}`);
    },
  });

  const deleteNoteMutation = trpc.scratchPad.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Note deleted");
    },
    onError: (error: unknown) => {
      toast.error(`Failed to delete note: ${(error as Error).message}`);
    },
  });

  const toggleCompleteMutation = trpc.scratchPad.toggleComplete.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error: unknown) => {
      toast.error(`Failed to update note: ${(error as Error).message}`);
    },
  });

  // Handlers
  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    createNoteMutation.mutate({ content: newNoteContent });
  };

  const handleUpdateNote = (id: number, content: string) => {
    updateNoteMutation.mutate({ noteId: id, content });
  };

  const handleDeleteNote = (id: number) => {
    deleteNoteMutation.mutate({ noteId: id });
  };

  const handleToggleComplete = (id: number) => {
    toggleCompleteMutation.mutate({ noteId: id });
  };

  const notes = notesData?.notes || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Scratch Pad</SheetTitle>
          <SheetDescription>
            Quick notes and reminders accessible from anywhere
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Add Note Section */}
          {isAddingNote ? (
            <div className="space-y-2">
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your note..."
                className="min-h-[100px] resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsAddingNote(false);
                    setNewNoteContent("");
                  }
                  if (e.key === "Enter" && e.metaKey) {
                    handleAddNote();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddNote}
                  disabled={createNoteMutation.isPending}
                  className="flex-1"
                >
                  {createNoteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Note
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddingNote(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          )}

          {/* Notes List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3 pr-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`scratchpad-skeleton-${i}`} className="space-y-2 p-4 border rounded-lg">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))
              ) : notes.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No notes yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first note to get started
                  </p>
                </div>
              ) : (
                // Notes list
                notes.map((note: { id: number; content: string; isCompleted: boolean; createdAt: string | Date }) => (
                  <NoteCard
                    key={note.id}
                    noteId={note.id}
                    content={note.content}
                    isCompleted={note.isCompleted}
                    createdAt={new Date(note.createdAt)}
                    onToggleComplete={handleToggleComplete}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer info */}
          {notes.length > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

