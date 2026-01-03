import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Archive, ArchiveRestore } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

/**
 * CalendarGeneralSettings Component
 * CAL-001: Calendar CRUD management
 * Extracted from CalendarSettings.tsx for better maintainability
 */
export function CalendarGeneralSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: calendars, refetch } = trpc.calendarsManagement.list.useQuery({
    includeArchived: showArchived,
  });

  const createMutation = trpc.calendarsManagement.create.useMutation({
    onSuccess: () => {
      toast.success("Calendar created successfully");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create calendar");
    },
  });

  const updateMutation = trpc.calendarsManagement.update.useMutation({
    onSuccess: () => {
      toast.success("Calendar updated successfully");
      setEditingCalendar(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update calendar");
    },
  });

  const archiveMutation = trpc.calendarsManagement.archive.useMutation({
    onSuccess: () => {
      toast.success("Calendar archived successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive calendar");
    },
  });

  const restoreMutation = trpc.calendarsManagement.restore.useMutation({
    onSuccess: () => {
      toast.success("Calendar restored successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restore calendar");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Calendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CalendarForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg divide-y">
        {calendars?.map((calendar: any) => (
          <div
            key={calendar.id}
            className={`p-4 flex items-center justify-between ${
              calendar.isArchived ? "bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: calendar.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{calendar.name}</span>
                  {calendar.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {calendar.isArchived && (
                    <Badge variant="outline" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{calendar.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Access: {calendar.accessLevel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editingCalendar?.id === calendar.id ? (
                <Dialog open={true} onOpenChange={() => setEditingCalendar(null)}>
                  <DialogContent>
                    <CalendarForm
                      initialData={calendar}
                      onSubmit={(data) =>
                        updateMutation.mutate({ id: calendar.id, ...data })
                      }
                      onCancel={() => setEditingCalendar(null)}
                      isLoading={updateMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingCalendar(calendar)}
                disabled={calendar.accessLevel !== "admin"}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              {calendar.isArchived ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => restoreMutation.mutate({ id: calendar.id })}
                  disabled={calendar.accessLevel !== "admin"}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={calendar.accessLevel !== "admin"}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Calendar</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will archive the "{calendar.name}" calendar. Events will be
                        preserved but the calendar will be hidden from the main view.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => archiveMutation.mutate({ id: calendar.id })}
                      >
                        Archive
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
        {(!calendars || calendars.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">
            No calendars found
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#3B82F6");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, color, isDefault });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit Calendar" : "Create Calendar"}</DialogTitle>
        <DialogDescription>
          {initialData
            ? "Update the calendar details below."
            : "Add a new calendar to organize your events."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sales Team"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Calendar for sales team meetings and appointments"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="isDefault">Set as default calendar</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Save Changes" : "Create Calendar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default CalendarGeneralSettings;
