import { useState, useEffect, useRef } from "react";
import { X, Pin, PinOff, Minimize2, Maximize2, Square, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";

type SizePreset = "compact" | "medium" | "large" | "custom";

interface ScratchPadPreferences {
  isFloating: boolean;
  position: { x: number; y: number };
  size: SizePreset;
  customSize?: { width: number; height: number };
  opacity: number;
  isLocked: boolean;
  isMinimized: boolean;
  snapToEdges: boolean;
}

const SIZE_PRESETS = {
  compact: { width: 300, height: 400 },
  medium: { width: 500, height: 600 },
  large: { width: 700, height: 800 },
};

const STORAGE_KEY = "terp_scratchpad_preferences";

export function FloatingScratchPad({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [content, setContent] = useState("");
  const [preferences, setPreferences] = useState<ScratchPadPreferences>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return {
      isFloating: false,
      position: { x: window.innerWidth - 550, y: 100 },
      size: "medium" as SizePreset,
      opacity: 1,
      isLocked: false,
      isMinimized: false,
      snapToEdges: true,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Ctrl+Shift+N or Cmd+Shift+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // This would need to be handled by parent component
          // For now, just toggle floating mode if already open
          if (preferences.isFloating) {
            setPreferences((prev) => ({ ...prev, isFloating: false }));
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, preferences.isFloating]);

  // Load scratch pad content from API
  const { data: notesList } = trpc.scratchPad.list.useQuery({ limit: 1 });
  const createMutation = trpc.scratchPad.create.useMutation();
  const updateMutation = trpc.scratchPad.update.useMutation();
  const [noteId, setNoteId] = useState<number | null>(null);

  useEffect(() => {
    if (notesList?.notes && notesList.notes.length > 0) {
      const firstNote = notesList.notes[0];
      setNoteId(firstNote.id);
      setContent(firstNote.content);
    }
  }, [notesList]);

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  // Auto-save content
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!noteId) {
        // Create new note if none exists
        if (content.trim()) {
          createMutation.mutate({ content }, {
            onSuccess: (data) => setNoteId(data.insertId),
          });
        }
      } else if (content !== notesList?.notes[0]?.content) {
        updateMutation.mutate({ noteId, content });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, noteId, notesList, createMutation, updateMutation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (preferences.isLocked || !preferences.isFloating) return;
    if ((e.target as HTMLElement).closest("textarea, button, input")) return;

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPreferences((prev) => ({
        ...prev,
        position: {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        },
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Snap to edges if enabled
      if (preferences.snapToEdges) {
        setPreferences((prev) => {
          const { x, y } = prev.position;
          const snapThreshold = 20;
          let newX = x;
          let newY = y;
          
          // Snap to left edge
          if (x < snapThreshold) newX = 0;
          // Snap to right edge
          if (x + currentSize.width > window.innerWidth - snapThreshold) {
            newX = window.innerWidth - currentSize.width;
          }
          // Snap to top edge
          if (y < snapThreshold) newY = 0;
          // Snap to bottom edge
          if (y + currentSize.height > window.innerHeight - snapThreshold) {
            newY = window.innerHeight - currentSize.height;
          }
          
          return { ...prev, position: { x: newX, y: newY } };
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const toggleFloating = () => {
    setPreferences((prev) => ({ ...prev, isFloating: !prev.isFloating }));
  };

  const setSize = (size: SizePreset) => {
    setPreferences((prev) => ({ ...prev, size }));
  };

  const setOpacity = (opacity: number) => {
    setPreferences((prev) => ({ ...prev, opacity }));
  };

  const toggleLock = () => {
    setPreferences((prev) => ({ ...prev, isLocked: !prev.isLocked }));
  };

  const toggleMinimize = () => {
    setPreferences((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  const toggleSnapToEdges = () => {
    setPreferences((prev) => ({ ...prev, snapToEdges: !prev.snapToEdges }));
  };

  if (!isOpen) return null;

  const currentSize =
    preferences.size === "custom" && preferences.customSize
      ? preferences.customSize
      : SIZE_PRESETS[preferences.size as keyof typeof SIZE_PRESETS];

  const displayOpacity = isFocused ? 1 : preferences.opacity;

  // Modal mode (non-floating)
  if (!preferences.isFloating) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Scratch Pad</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleFloating} title="Pin to float">
                <Pin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-hidden">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quick notes, ideas, todos..."
              className="w-full h-full resize-none font-mono text-sm"
            />
          </div>

          {/* Footer */}
          <div className="p-3 border-t text-xs text-muted-foreground flex justify-between">
            <span>{content.length} characters</span>
            <span>{updateMutation.isPending ? "Saving..." : "Saved"}</span>
          </div>
        </div>
      </div>
    );
  }

  // Minimized tab mode
  if (preferences.isFloating && preferences.isMinimized) {
    return (
      <div
        className="fixed z-50 bg-background/95 backdrop-blur-lg rounded-t-xl shadow-2xl border border-b-0 cursor-pointer hover:bg-accent/50 transition-colors"
        style={{
          right: 20,
          bottom: 0,
          width: 200,
          opacity: displayOpacity,
        }}
        onClick={toggleMinimize}
        onMouseEnter={() => setIsFocused(true)}
        onMouseLeave={() => setIsFocused(false)}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            <span className="text-sm font-semibold">Scratch Pad</span>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Floating mode
  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col bg-background/95 backdrop-blur-lg rounded-xl shadow-2xl border transition-opacity duration-200"
      style={{
        left: preferences.position.x,
        top: preferences.position.y,
        width: currentSize.width,
        height: currentSize.height,
        opacity: displayOpacity,
        cursor: isDragging ? "grabbing" : preferences.isLocked ? "default" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Scratch Pad</h3>
          {preferences.isLocked && <span className="text-xs text-muted-foreground">(Locked)</span>}
        </div>
        <div className="flex items-center gap-1">
          {/* Size presets */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSize("compact")}
            title="Compact"
            className={preferences.size === "compact" ? "bg-accent" : ""}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSize("medium")}
            title="Medium"
            className={preferences.size === "medium" ? "bg-accent" : ""}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSize("large")}
            title="Large"
            className={preferences.size === "large" ? "bg-accent" : ""}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>

          {/* Lock position */}
          {/* Lock position */}
          <Button variant="ghost" size="sm" onClick={toggleLock} title="Lock position">
            {preferences.isLocked ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>

          {/* Minimize to tab */}
          <Button variant="ghost" size="sm" onClick={toggleMinimize} title="Minimize to tab">
            <Minimize2 className="h-4 w-4" />
          </Button>

          {/* Unpin (back to modal) */}
          <Button variant="ghost" size="sm" onClick={toggleFloating} title="Unpin">
            <PinOff className="h-4 w-4" />
          </Button>

          {/* Close */}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Opacity control */}
      <div className="px-3 py-2 border-b bg-background/30 flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Opacity:</span>
        <Slider
          value={[preferences.opacity * 100]}
          onValueChange={([value]) => setOpacity(value / 100)}
          min={20}
          max={100}
          step={5}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-10 text-right">
          {Math.round(preferences.opacity * 100)}%
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-hidden">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Quick notes, ideas, todos..."
          className="w-full h-full resize-none font-mono text-sm bg-transparent border-none focus-visible:ring-0"
          onFocus={() => setIsFocused(true)}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-background/30 text-xs text-muted-foreground flex justify-between">
        <span>{content.length} characters</span>
        <span>{updateMutation.isPending ? "Saving..." : "Saved"}</span>
      </div>
    </div>
  );
}

