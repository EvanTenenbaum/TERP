import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Clock } from "lucide-react";
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
 * CalendarAppointmentTypes Component
 * CAL-002: Appointment type management
 * Extracted from CalendarSettings.tsx for better maintainability
 */
export function CalendarAppointmentTypes() {
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: calendars } = trpc.calendarsManagement.list.useQuery({});
  const { data: appointmentTypes, refetch } =
    trpc.calendarsManagement.listAppointmentTypes.useQuery(
      { calendarId: selectedCalendarId!, includeInactive: showInactive },
      { enabled: !!selectedCalendarId }
    );

  const createMutation = trpc.calendarsManagement.createAppointmentType.useMutation({
    onSuccess: () => {
      toast.success("Appointment type created successfully");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create appointment type");
    },
  });

  const updateMutation = trpc.calendarsManagement.updateAppointmentType.useMutation({
    onSuccess: () => {
      toast.success("Appointment type updated successfully");
      setEditingType(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update appointment type");
    },
  });

  const deleteMutation = trpc.calendarsManagement.deleteAppointmentType.useMutation({
    onSuccess: () => {
      toast.success("Appointment type deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete appointment type");
    },
  });

  // Auto-select first calendar if none selected
  if (!selectedCalendarId && calendars && calendars.length > 0) {
    setSelectedCalendarId(calendars[0].id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="calendar-select">Select Calendar</Label>
          <select
            id="calendar-select"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
            value={selectedCalendarId || ""}
            onChange={(e) => setSelectedCalendarId(Number(e.target.value))}
          >
            {calendars?.map((cal: any) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-6 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedCalendarId}>
                <Plus className="h-4 w-4 mr-2" />
                New Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <AppointmentTypeForm
                calendarId={selectedCalendarId!}
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setIsDialogOpen(false)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {appointmentTypes?.map((type: any) => (
          <div
            key={type.id}
            className={`p-4 flex items-center justify-between ${
              !type.isActive ? "bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: type.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{type.name}</span>
                  {!type.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {type.duration} min
                  </span>
                  {type.bufferBefore > 0 && (
                    <span>+{type.bufferBefore}m before</span>
                  )}
                  {type.bufferAfter > 0 && <span>+{type.bufferAfter}m after</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editingType?.id === type.id && (
                <Dialog open={true} onOpenChange={() => setEditingType(null)}>
                  <DialogContent className="max-w-md">
                    <AppointmentTypeForm
                      calendarId={selectedCalendarId!}
                      initialData={type}
                      onSubmit={(data) =>
                        updateMutation.mutate({ id: type.id, ...data })
                      }
                      onCancel={() => setEditingType(null)}
                      isLoading={updateMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditingType(type)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Appointment Type</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{type.name}" appointment type.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: type.id })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {(!appointmentTypes || appointmentTypes.length === 0) && selectedCalendarId && (
          <div className="p-8 text-center text-muted-foreground">
            No appointment types found for this calendar
          </div>
        )}
        {!selectedCalendarId && (
          <div className="p-8 text-center text-muted-foreground">
            Select a calendar to view appointment types
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentTypeForm({
  calendarId,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  calendarId: number;
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [duration, setDuration] = useState(initialData?.duration || 30);
  const [bufferBefore, setBufferBefore] = useState(initialData?.bufferBefore || 0);
  const [bufferAfter, setBufferAfter] = useState(initialData?.bufferAfter || 0);
  const [minNoticeHours, setMinNoticeHours] = useState(initialData?.minNoticeHours || 24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(initialData?.maxAdvanceDays || 30);
  const [color, setColor] = useState(initialData?.color || "#F59E0B");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      calendarId,
      name,
      description,
      duration,
      bufferBefore,
      bufferAfter,
      minNoticeHours,
      maxAdvanceDays,
      color,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {initialData ? "Edit Appointment Type" : "Create Appointment Type"}
        </DialogTitle>
        <DialogDescription>
          {initialData
            ? "Update the appointment type details below."
            : "Define a new type of appointment that can be booked."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="type-name">Name</Label>
          <Input
            id="type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Payment Pickup"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type-description">Description</Label>
          <Input
            id="type-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Appointment for payment collection"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
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
                className="w-10 h-8 rounded cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
            <Input
              id="bufferBefore"
              type="number"
              min={0}
              max={120}
              value={bufferBefore}
              onChange={(e) => setBufferBefore(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bufferAfter">Buffer After (min)</Label>
            <Input
              id="bufferAfter"
              type="number"
              min={0}
              max={120}
              value={bufferAfter}
              onChange={(e) => setBufferAfter(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minNoticeHours">Min Notice (hours)</Label>
            <Input
              id="minNoticeHours"
              type="number"
              min={0}
              max={720}
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxAdvanceDays">Max Advance (days)</Label>
            <Input
              id="maxAdvanceDays"
              type="number"
              min={1}
              max={365}
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
            />
          </div>
        </div>
        {initialData && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Save Changes" : "Create Type"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default CalendarAppointmentTypes;
