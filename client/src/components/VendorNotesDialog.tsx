import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Pencil, Trash2, History, FileText } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface VendorNotesDialogProps {
  vendorId: number;
  vendorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VendorNote {
  id: number;
  vendorId: number;
  userId: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
}

interface VendorHistoryItem {
  id: number;
  actorId: number;
  entity: string;
  entityId: number;
  action: string;
  before: string | null;
  after: string | null;
  reason: string | null;
  createdAt: Date;
  actorName: string | null;
}

export function VendorNotesDialog({
  vendorId,
  vendorName,
  open,
  onOpenChange,
}: VendorNotesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Fetch notes
  const { data: notesData } = useQuery({
    queryKey: ["vendorNotes", vendorId],
    queryFn: async () => {
      const result = await trpc.vendors.getNotes.query({ vendorId });
      return result.data as VendorNote[];
    },
    enabled: open,
  });

  // Fetch history
  const { data: historyData } = useQuery({
    queryKey: ["vendorHistory", vendorId],
    queryFn: async () => {
      const result = await trpc.vendors.getHistory.query({ vendorId });
      return result.data as VendorHistoryItem[];
    },
    enabled: open,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return trpc.vendors.createNote.mutate({
        vendorId,
        userId: 1, // TODO: Get from auth context
        note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorNotes", vendorId] });
      setNewNote("");
      toast({
        title: "Note created",
        description: "Vendor note has been added successfully.",
      });
    },
    onError: _error => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      return trpc.vendors.updateNote.mutate({ id, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorNotes", vendorId] });
      setEditingNoteId(null);
      setEditingNoteText("");
      toast({
        title: "Note updated",
        description: "Vendor note has been updated successfully.",
      });
    },
    onError: _error => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      return trpc.vendors.deleteNote.mutate({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendorNotes", vendorId] });
      toast({
        title: "Note deleted",
        description: "Vendor note has been deleted successfully.",
      });
    },
    onError: _error => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateNote = () => {
    if (newNote.trim()) {
      createNoteMutation.mutate(newNote);
    }
  };

  const handleUpdateNote = (id: number) => {
    if (editingNoteText.trim()) {
      updateNoteMutation.mutate({ id, note: editingNoteText });
    }
  };

  const handleDeleteNote = (id: number) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  const startEditing = (note: VendorNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.note);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notes & History: {vendorName}</DialogTitle>
          <DialogDescription>
            View and manage notes and history for this vendor
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            {/* Create new note */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a new note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
                maxLength={5000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {newNote.length} / 5000 characters
              </div>
              <Button
                onClick={handleCreateNote}
                disabled={!newNote.trim() || createNoteMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>

            {/* Notes list */}
            <div className="space-y-3">
              {notesData && notesData.length > 0 ? (
                notesData.map(note => (
                  <div
                    key={note.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    {editingNoteId === note.id ? (
                      <>
                        <Textarea
                          value={editingNoteText}
                          onChange={e => setEditingNoteText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={
                              !editingNoteText.trim() ||
                              updateNoteMutation.isPending
                            }
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {note.userName || "Unknown"} •{" "}
                            {formatDistanceToNow(new Date(note.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(note)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No notes yet. Add your first note above.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {historyData && historyData.length > 0 ? (
              historyData.map(item => (
                <div key={item.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.actorName || "Unknown"} •{" "}
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {item.before && (
                    <div className="text-xs">
                      <span className="font-medium">Before: </span>
                      <span className="text-muted-foreground">
                        {item.before}
                      </span>
                    </div>
                  )}
                  {item.after && (
                    <div className="text-xs">
                      <span className="font-medium">After: </span>
                      <span className="text-muted-foreground">
                        {item.after}
                      </span>
                    </div>
                  )}
                  {item.reason && (
                    <div className="text-xs">
                      <span className="font-medium">Reason: </span>
                      <span className="text-muted-foreground">
                        {item.reason}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No history available for this vendor.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
