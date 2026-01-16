/**
 * Session Notes Component (MEET-075-FE)
 *
 * Provides a textarea for internal session notes with auto-save functionality.
 * Notes are synced in real-time and visible to all staff viewing the session.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";

interface SessionNotesProps {
  sessionId: number;
  initialNotes?: string;
  compact?: boolean;
}

export const SessionNotes: React.FC<SessionNotesProps> = ({
  sessionId,
  initialNotes = "",
  compact = false,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current notes
  const { data: notesData } = trpc.liveShopping.getSessionNotes.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchOnWindowFocus: false,
    }
  );

  // Update local state when data loads
  useEffect(() => {
    if (notesData?.notes && notesData.notes !== notes) {
      setNotes(notesData.notes);
    }
  }, [notesData]);

  const updateNotesMutation = trpc.liveShopping.updateSessionNotes.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error(`Failed to save notes: ${error.message}`);
    },
  });

  // Auto-save with debounce
  const debouncedSave = useCallback(
    (value: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        updateNotesMutation.mutate({
          sessionId,
          notes: value,
        });
      }, 1000); // Save 1 second after user stops typing
    },
    [sessionId, updateNotesMutation]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    debouncedSave(value);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
      >
        <span>Notes</span>
        {notes && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Session Notes</span>
          {isSaving && (
            <span className="text-xs text-gray-400">
              <span className="inline-block animate-pulse">Saving...</span>
            </span>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-gray-400">{formatLastSaved()}</span>
          )}
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Minimize
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className="p-2">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Add internal notes about this session..."
          className="w-full h-24 p-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Footer with character count */}
      <div className="px-3 py-1 bg-gray-50 border-t border-gray-200">
        <span className="text-xs text-gray-400">{notes.length}/5000 characters</span>
      </div>
    </div>
  );
};

export default SessionNotes;
