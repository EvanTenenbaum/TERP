import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  Users,
  Archive,
  ArchiveRestore,
} from "lucide-react";
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
 * Calendar Settings Component
 * CAL-001 & CAL-002: Calendar management, appointment types, and availability
 */
export function CalendarSettings() {
  const [activeTab, setActiveTab] = useState("calendars");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Management
        </CardTitle>
        <CardDescription>
          Configure calendars, appointment types, and availability schedules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendars">Calendars</TabsTrigger>
            <TabsTrigger value="appointment-types">Appointment Types</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>
          <TabsContent value="calendars" className="mt-4">
            <CalendarsManager />
          </TabsContent>
          <TabsContent value="appointment-types" className="mt-4">
            <AppointmentTypesManager />
          </TabsContent>
          <TabsContent value="availability" className="mt-4">
            <AvailabilityManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Calendars Manager (CAL-001)
// ============================================================================

function CalendarsManager() {
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

// ============================================================================
// Appointment Types Manager (CAL-002)
// ============================================================================

function AppointmentTypesManager() {
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

// ============================================================================
// Availability Manager (CAL-002)
// ============================================================================

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function AvailabilityManager() {
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [blockedDateInput, setBlockedDateInput] = useState("");
  const [blockedReasonInput, setBlockedReasonInput] = useState("");

  const { data: calendars } = trpc.calendarsManagement.list.useQuery({});
  const { data: availability, refetch: refetchAvailability } =
    trpc.calendarsManagement.listAvailability.useQuery(
      { calendarId: selectedCalendarId! },
      { enabled: !!selectedCalendarId }
    );
  const { data: blockedDates, refetch: refetchBlocked } =
    trpc.calendarsManagement.listBlockedDates.useQuery(
      { calendarId: selectedCalendarId! },
      { enabled: !!selectedCalendarId }
    );

  const setAvailabilityMutation = trpc.calendarsManagement.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("Availability updated");
      refetchAvailability();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update availability");
    },
  });

  const addBlockedMutation = trpc.calendarsManagement.addBlockedDate.useMutation({
    onSuccess: () => {
      toast.success("Blocked date added");
      setBlockedDateInput("");
      setBlockedReasonInput("");
      refetchBlocked();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add blocked date");
    },
  });

  const removeBlockedMutation = trpc.calendarsManagement.removeBlockedDate.useMutation({
    onSuccess: () => {
      toast.success("Blocked date removed");
      refetchBlocked();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove blocked date");
    },
  });

  // Auto-select first calendar if none selected
  if (!selectedCalendarId && calendars && calendars.length > 0) {
    setSelectedCalendarId(calendars[0].id);
  }

  // Group availability by day
  const availabilityByDay: Record<number, Array<{ id: number; startTime: string; endTime: string }>> = {};
  for (let i = 0; i < 7; i++) {
    availabilityByDay[i] = [];
  }
  availability?.forEach((slot: any) => {
    availabilityByDay[slot.dayOfWeek]?.push({
      id: slot.id,
      startTime: slot.startTime?.slice(0, 5) || "",
      endTime: slot.endTime?.slice(0, 5) || "",
    });
  });

  const handleAddSlot = (dayOfWeek: number) => {
    const currentSlots = availabilityByDay[dayOfWeek] || [];
    const newSlots = [
      ...currentSlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
      { startTime: "09:00", endTime: "17:00" },
    ];
    setAvailabilityMutation.mutate({
      calendarId: selectedCalendarId!,
      dayOfWeek,
      slots: newSlots,
    });
  };

  const handleRemoveSlot = (dayOfWeek: number, index: number) => {
    const currentSlots = availabilityByDay[dayOfWeek] || [];
    const newSlots = currentSlots
      .filter((_, i) => i !== index)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
    setAvailabilityMutation.mutate({
      calendarId: selectedCalendarId!,
      dayOfWeek,
      slots: newSlots,
    });
  };

  const handleUpdateSlot = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    const currentSlots = availabilityByDay[dayOfWeek] || [];
    const newSlots = currentSlots.map((s, i) => {
      if (i === index) {
        return { ...s, [field]: value };
      }
      return { startTime: s.startTime, endTime: s.endTime };
    });
    setAvailabilityMutation.mutate({
      calendarId: selectedCalendarId!,
      dayOfWeek,
      slots: newSlots,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="avail-calendar-select">Select Calendar</Label>
          <select
            id="avail-calendar-select"
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
      </div>

      {/* Weekly Availability */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Weekly Schedule
        </h3>
        <div className="border rounded-lg divide-y">
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <div key={day} className="p-3 flex items-start gap-4">
              <div className="w-24 pt-2 font-medium text-sm">{day}</div>
              <div className="flex-1 space-y-2">
                {(availabilityByDay[dayIndex] || []).map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        handleUpdateSlot(dayIndex, slotIndex, "startTime", e.target.value)
                      }
                      className="w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        handleUpdateSlot(dayIndex, slotIndex, "endTime", e.target.value)
                      }
                      className="w-28"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(availabilityByDay[dayIndex]?.length || 0) === 0 && (
                  <span className="text-sm text-muted-foreground">Unavailable</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddSlot(dayIndex)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Blocked Dates
        </h3>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="blocked-date">Date</Label>
            <Input
              id="blocked-date"
              type="date"
              value={blockedDateInput}
              onChange={(e) => setBlockedDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="blocked-reason">Reason (optional)</Label>
            <Input
              id="blocked-reason"
              value={blockedReasonInput}
              onChange={(e) => setBlockedReasonInput(e.target.value)}
              placeholder="e.g., Company Holiday"
            />
          </div>
          <Button
            onClick={() =>
              addBlockedMutation.mutate({
                calendarId: selectedCalendarId!,
                date: blockedDateInput,
                reason: blockedReasonInput || undefined,
              })
            }
            disabled={!blockedDateInput || !selectedCalendarId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {blockedDates?.map((blocked: any) => (
            <div key={blocked.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {new Date(blocked.date).toLocaleDateString()}
                </span>
                {blocked.reason && (
                  <span className="ml-2 text-muted-foreground">- {blocked.reason}</span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeBlockedMutation.mutate({ id: blocked.id })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!blockedDates || blockedDates.length === 0) && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No blocked dates
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarSettings;
