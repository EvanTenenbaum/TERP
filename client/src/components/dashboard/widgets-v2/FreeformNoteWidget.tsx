import { useState, useEffect } from "react";
import "./tiptap-styles.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  CheckSquare,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";

interface FreeformNoteWidgetProps {
  noteId?: number;
  onNoteDeleted?: () => void;
}

type WidgetSize = "compact" | "standard" | "expanded";

const SIZE_HEIGHTS: Record<WidgetSize, string> = {
  compact: "h-[250px]",
  standard: "h-[400px]",
  expanded: "h-[600px]",
};

export function FreeformNoteWidget({ noteId, onNoteDeleted }: FreeformNoteWidgetProps) {
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(noteId || null);
  const [title, setTitle] = useState("Quick Notes");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [widgetSize, setWidgetSize] = useState<WidgetSize>("standard");
  const [isInitialized, setIsInitialized] = useState(false);

  // tRPC mutations
  const createNoteMutation = trpc.freeformNotes.create.useMutation();
  const updateNoteMutation = trpc.freeformNotes.update.useMutation();

  // Load existing note if noteId provided
  const { data: existingNote, isLoading: isLoadingNote } = trpc.freeformNotes.getById.useQuery(
    { noteId: currentNoteId! },
    { enabled: !!currentNoteId }
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start typing... Use Tab to indent, Shift+Tab to outdent",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-4 tiptap-editor overflow-y-auto",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            editor.chain().focus().sinkListItem("listItem").run() ||
              editor.chain().focus().sinkListItem("taskItem").run();
          }
          return true;
        }
        if (event.key === "Tab" && event.shiftKey) {
          event.preventDefault();
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            editor.chain().focus().liftListItem("listItem").run() ||
              editor.chain().focus().liftListItem("taskItem").run();
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getJSON());
    },
  });

  // Load existing note content
  useEffect(() => {
    if (existingNote && editor && !isInitialized) {
      setTitle(existingNote.title);
      editor.commands.setContent(existingNote.content as any);
      setLastSaved(new Date(existingNote.updatedAt));
      setIsInitialized(true);
    } else if (!existingNote && editor && !isInitialized) {
      // No existing note, mark as initialized to allow saves
      setIsInitialized(true);
    }
  }, [existingNote, editor, isInitialized]);

  // Auto-save with debounce
  const handleContentChange = (content: any) => {
    // Don't save during initialization
    if (!isInitialized) {
      return;
    }
    
    if (!currentNoteId) {
      // Create new note
      createNoteMutation.mutate(
        {
          title,
          content,
        },
        {
          onSuccess: (data) => {
            setCurrentNoteId(data as number);
            setLastSaved(new Date());
          },
        }
      );
    } else {
      // Update existing note
      debouncedSave(content);
    }
  };

  const debouncedSave = useDebounce((content: any) => {
    setIsSaving(true);
    updateNoteMutation.mutate(
      {
        noteId: currentNoteId!,
        title,
        content,
      },
      {
        onSuccess: () => {
          setIsSaving(false);
          setLastSaved(new Date());
        },
        onError: () => {
          setIsSaving(false);
        },
      }
    );
  }, 2000);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (currentNoteId) {
      updateNoteMutation.mutate({
        noteId: currentNoteId,
        title: newTitle,
      });
    }
  };

  const cycleSize = () => {
    const sizes: WidgetSize[] = ["compact", "standard", "expanded"];
    const currentIndex = sizes.indexOf(widgetSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setWidgetSize(sizes[nextIndex]);
  };

  if (isLoadingNote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
            placeholder="Note title..."
          />
          <div className="flex items-center gap-2">
            {/* Save Status */}
            {isSaving ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-green-600" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            ) : null}

            {/* Size Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleSize}
              className="h-8 w-8 p-0"
              title={`Current: ${widgetSize}. Click to cycle size.`}
            >
              {widgetSize === "compact" ? (
                <Minimize2 className="h-4 w-4" />
              ) : widgetSize === "expanded" ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4 opacity-50" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Simplified Toolbar */}
        <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b">
          <Button
            variant={editor?.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={editor?.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={editor?.isActive("underline") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className="h-8 w-8 p-0"
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>

          <div className="w-px h-8 bg-border mx-1" />

          <Button
            variant={editor?.isActive("bulletList") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={editor?.isActive("orderedList") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className="h-8 w-8 p-0"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant={editor?.isActive("taskList") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            className="h-8 w-8 p-0"
            title="Checklist"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div className={`${SIZE_HEIGHTS[widgetSize]} overflow-hidden`}>
          <EditorContent editor={editor} className="h-full" />
        </div>
      </CardContent>
    </Card>
  );
}

