import { useState, useEffect, useCallback } from "react";
import "./tiptap-styles.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { CommentsPanel } from "./CommentsPanel";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { TemplateSelector, type Template } from "./TemplateSelector";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Loader2,
  Pin,
  Archive,
  Trash2,
  MessageSquare,
  Clock,
} from "lucide-react";

interface FreeformNoteWidgetProps {
  noteId?: number;
  onNoteDeleted?: () => void;
}

export function FreeformNoteWidget({ noteId, onNoteDeleted }: FreeformNoteWidgetProps) {
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(noteId || null);
  const [title, setTitle] = useState("Untitled Note");
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "comments" | "activity">("editor");
  const [hasAppliedTemplate, setHasAppliedTemplate] = useState(false);

  // tRPC mutations
  const createNoteMutation = trpc.freeformNotes.create.useMutation();
  const updateNoteMutation = trpc.freeformNotes.update.useMutation();
  const deleteNoteMutation = trpc.freeformNotes.delete.useMutation();
  const togglePinMutation = trpc.freeformNotes.togglePin.useMutation();
  const toggleArchiveMutation = trpc.freeformNotes.toggleArchive.useMutation();

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
        nested: true, // Enable nested checkboxes
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start typing... Tab to indent, Shift+Tab to outdent",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 tiptap-editor",
      },
      handleKeyDown: (view, event) => {
        // Tab to indent
        if (event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            editor.chain().focus().sinkListItem("listItem").run() ||
              editor.chain().focus().sinkListItem("taskItem").run();
            return true;
          }
        }
        // Shift+Tab to outdent
        if (event.key === "Tab" && event.shiftKey) {
          event.preventDefault();
          if (editor.isActive("listItem") || editor.isActive("taskItem")) {
            editor.chain().focus().liftListItem("listItem").run() ||
              editor.chain().focus().liftListItem("taskItem").run();
            return true;
          }
        }
        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      setShowFloatingToolbar(hasSelection);

      if (hasSelection) {
        // Calculate toolbar position
        const { view } = editor;
        const start = view.coordsAtPos(from);
        setToolbarPosition({
          top: start.top - 50,
          left: start.left,
        });
      }
    },
  });

  // Load existing note content into editor
  useEffect(() => {
    if (existingNote && editor) {
      setTitle(existingNote.title);
      if (existingNote.content) {
        editor.commands.setContent(existingNote.content);
      }
    }
  }, [existingNote, editor]);

  // Auto-save function
  const saveNote = useCallback(async () => {
    if (!editor) return;

    const content = editor.getJSON();
    setIsSaving(true);

    try {
      if (currentNoteId) {
        // Update existing note
        await updateNoteMutation.mutateAsync({
          noteId: currentNoteId,
          title,
          content,
        });
      } else {
        // Create new note
        const newNoteId = await createNoteMutation.mutateAsync({
          title,
          content,
        });
        setCurrentNoteId(newNoteId);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, currentNoteId, title, updateNoteMutation, createNoteMutation]);

  // Debounced auto-save (1 second delay)
  const debouncedContent = useDebounce(editor?.getJSON(), 1000);
  const debouncedTitle = useDebounce(title, 1000);

  useEffect(() => {
    if (editor && (debouncedContent || debouncedTitle)) {
      saveNote();
    }
  }, [debouncedContent, debouncedTitle, saveNote]);

  // Delete note handler
  const handleDelete = async () => {
    if (!currentNoteId) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteNoteMutation.mutateAsync({ noteId: currentNoteId });
      onNoteDeleted?.();
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // Toggle pin handler
  const handleTogglePin = async () => {
    if (!currentNoteId) return;

    try {
      await togglePinMutation.mutateAsync({ noteId: currentNoteId });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  // Toggle archive handler
  const handleToggleArchive = async () => {
    if (!currentNoteId) return;

    try {
      await toggleArchiveMutation.mutateAsync({ noteId: currentNoteId });
    } catch (error) {
      console.error("Failed to toggle archive:", error);
    }
  };

  // Apply template handler
  const handleApplyTemplate = (template: Template) => {
    if (!editor) return;

    // Set title if it's still "Untitled Note"
    if (title === "Untitled Note") {
      setTitle(template.name);
    }

    // Set content from template
    editor.commands.setContent(template.content);
    setHasAppliedTemplate(true);

    // Save note with template type
    if (currentNoteId) {
      updateNoteMutation.mutate({
        noteId: currentNoteId,
        title: title === "Untitled Note" ? template.name : title,
        content: template.content,
      });
    } else {
      createNoteMutation.mutate({
        title: template.name,
        content: template.content,
        templateType: template.id,
      });
    }
  };

  if (isLoadingNote) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col relative">
      {/* Title & Actions */}
      <div className="border-b p-4 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isTitleEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsTitleEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsTitleEditing(false);
                }
              }}
              className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 p-0"
              autoFocus
            />
          ) : (
            <h3
              className="text-xl font-semibold cursor-pointer hover:text-primary truncate"
              onClick={() => setIsTitleEditing(true)}
            >
              {title}
            </h3>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Template Selector (only show if no template applied yet) */}
          {!hasAppliedTemplate && !currentNoteId && (
            <TemplateSelector onSelectTemplate={handleApplyTemplate} />
          )}

          {/* Save Status */}
          {isSaving ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              <span>Saved</span>
            </div>
          ) : null}

          {/* Pin Button */}
          {currentNoteId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              title="Pin note"
            >
              <Pin className={`h-4 w-4 ${existingNote?.isPinned ? 'fill-current' : ''}`} />
            </Button>
          )}

          {/* Archive Button */}
          {currentNoteId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleArchive}
              title="Archive note"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}

          {/* Delete Button */}
          {currentNoteId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              title="Delete note"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Editor, Comments, Activity */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="editor" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Editor
          </TabsTrigger>
          {currentNoteId && (
            <>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <MessageSquare className="h-4 w-4 mr-1" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Clock className="h-4 w-4 mr-1" />
                Activity
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 flex flex-col m-0">
          {/* Floating Toolbar (appears on text selection) */}
          {showFloatingToolbar && (
            <div
              className="fixed z-50 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1"
              style={{
                top: `${toolbarPosition.top}px`,
                left: `${toolbarPosition.left}px`,
              }}
            >
              {/* Bold */}
              <Button
                variant={editor.isActive("bold") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </Button>

              {/* Italic */}
              <Button
                variant={editor.isActive("italic") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </Button>

              {/* Underline */}
              <Button
                variant={editor.isActive("underline") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Bullet List */}
              <Button
                variant={editor.isActive("bulletList") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Button>

              {/* Numbered List */}
              <Button
                variant={editor.isActive("orderedList") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              {/* Task List (Checkboxes) */}
              <Button
                variant={editor.isActive("taskList") ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Headings */}
              <Button
                variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                <Heading1 className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>

          {/* Bottom Toolbar */}
          <div className="border-t p-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Alignment */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Tip: Tab to indent, Shift+Tab to outdent
            </div>
          </div>
        </TabsContent>

        {/* Comments Tab */}
        {currentNoteId && (
          <TabsContent value="comments" className="flex-1 overflow-y-auto p-4 m-0">
            <CommentsPanel noteId={currentNoteId} />
          </TabsContent>
        )}

        {/* Activity Tab */}
        {currentNoteId && (
          <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 m-0">
            <ActivityLogPanel noteId={currentNoteId} />
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}

