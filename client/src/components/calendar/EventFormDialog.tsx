import { useState, useEffect, useCallback } from "react";
import { Calendar, MapPin, Users, Repeat } from "lucide-react";
import { trpc } from "../../lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | null;
  initialDate?: Date | null;
  initialClientId?: number | null;
  onSaved: () => void;
}

export default function EventFormDialog({
  isOpen,
  onClose,
  eventId,
  initialDate,
  initialClientId,
  onSaved,
}: EventFormDialogProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [module, setModule] = useState("GENERAL");
  const [eventType, setEventType] = useState("MEETING");
  const [status, setStatus] = useState("SCHEDULED");
  const [priority, setPriority] = useState("MEDIUM");
  const [visibility, setVisibility] = useState("COMPANY");
  const [isRecurring, setIsRecurring] = useState(false);
  const [attendees, setAttendees] = useState<number[]>([]);
  const [clientId, setClientId] = useState<number | null>(initialClientId || null);
  const [calendarId, setCalendarId] = useState<number | null>(null);

  // Recurrence state
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("WEEKLY");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Queries - handle paginated response
  const { data: users } = trpc.userManagement.listUsers.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
  const { data: calendarsData } = trpc.calendarsManagement.list.useQuery({});

  // Mutations
  const createEvent = trpc.calendar.createEvent.useMutation();
  const updateEvent = trpc.calendar.updateEvent.useMutation();

  // Load event data if editing
  const { data: eventData } = trpc.calendar.getEventById.useQuery(
    { id: eventId!, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { enabled: !!eventId }
  );

  // Reset form function
  const resetForm = useCallback(() => {
    const dateToUse = initialDate || new Date();
    const dateStr = dateToUse.toISOString().split("T")[0];
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate(dateStr);
    setEndDate(dateStr);
    setStartTime("09:00");
    setEndTime("10:00");
    setIsAllDay(false);
    setModule("GENERAL");
    setEventType("MEETING");
    setStatus("SCHEDULED");
    setPriority("MEDIUM");
    setVisibility("COMPANY");
    setIsRecurring(false);
    setRecurrenceFrequency("WEEKLY");
    setRecurrenceInterval(1);
    setAttendees([]);
    setRecurrenceEndDate("");
    setClientId(initialClientId || null);
    // Set default calendar
    const defaultCalendar = calendarsData?.find((c: any) => c.isDefault);
    setCalendarId(defaultCalendar?.id || calendarsData?.[0]?.id || null);
  }, [initialDate, initialClientId, calendarsData]);

  // Populate form when editing
  useEffect(() => {
    if (eventData) {
      setTitle(eventData.title);
      setDescription(eventData.description || "");
      setLocation(eventData.location || "");
      setStartDate(typeof eventData.startDate === 'string' ? eventData.startDate : new Date(eventData.startDate).toISOString().split('T')[0]);
      setEndDate(typeof eventData.endDate === 'string' ? eventData.endDate : new Date(eventData.endDate).toISOString().split('T')[0]);
      setStartTime(eventData.startTime || "");
      setEndTime(eventData.endTime || "");
      setIsAllDay(!eventData.startTime);
      setModule(eventData.module);
      setEventType(eventData.eventType);
      setStatus(eventData.status);
      setPriority(eventData.priority);
      setVisibility(eventData.visibility);
      setIsRecurring(eventData.isRecurring);

      if (eventData.recurrenceRule) {
        setRecurrenceFrequency(eventData.recurrenceRule.frequency);
        setRecurrenceInterval(eventData.recurrenceRule.interval);
        const endDate = eventData.recurrenceRule.endDate;
        setRecurrenceEndDate(endDate ? (typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0]) : "");
      }

      // Load participants
      if (eventData.participants && eventData.participants.length > 0) {
        setAttendees(eventData.participants.map((p: any) => p.userId));
      }
      if (eventData.clientId) {
        setClientId(eventData.clientId);
      }
      // Load calendarId from event data
      if ((eventData as any).calendarId) {
        setCalendarId((eventData as any).calendarId);
      }
    } else if (isOpen && !eventId) {
      // Reset form for new event when dialog opens
      resetForm();
    }
  }, [eventData, initialDate, initialClientId, calendarsData, isOpen, eventId, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventPayload: any = {
      title,
      description,
      location,
      startDate,
      endDate,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isFloatingTime: isAllDay,
      module,
      eventType,
      status,
      priority,
      visibility,
      isRecurring,
      participants: attendees.length > 0 ? attendees : undefined,
      clientId: clientId || undefined,
    };

    if (isRecurring) {
      eventPayload.recurrenceRule = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval,
        startDate,
        endDate: recurrenceEndDate || undefined,
      };
    }

    try {
      if (eventId) {
        await updateEvent.mutateAsync({
          id: eventId,
          updates: eventPayload,
        });
      } else {
        await createEvent.mutateAsync(eventPayload);
      }
      onSaved();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  // Handle dialog close with form reset
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {eventId ? "Edit Event" : "Create Event"}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Event title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Event description"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAllDay"
              checked={isAllDay}
              onCheckedChange={(checked) => setIsAllDay(checked === true)}
            />
            <Label htmlFor="isAllDay" className="text-sm font-medium">
              All day event
            </Label>
          </div>

          {/* Time (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Calendar and Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Calendar *
              </Label>
              <Select
                value={calendarId?.toString() || ""}
                onValueChange={(value) => setCalendarId(value ? parseInt(value, 10) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendarsData?.map((calendar: any) => (
                    <SelectItem key={calendar.id} value={calendar.id.toString()}>
                      {calendar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={clientId?.toString() || "none"}
                onValueChange={(value) => setClientId(value === "none" ? null : parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name || `Client #${client.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Type and Event Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Type *</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                  <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                  <SelectItem value="CLIENTS">Clients</SelectItem>
                  <SelectItem value="VENDORS">Vendors</SelectItem>
                  <SelectItem value="ORDERS">Orders</SelectItem>
                  <SelectItem value="SAMPLES">Samples</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="PAYMENT_DUE">Payment Due</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="AUDIT">Audit</SelectItem>
                  <SelectItem value="INTAKE">Intake</SelectItem>
                  <SelectItem value="PHOTOGRAPHY">Photography</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility *</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Attendees
            </Label>
            <select
              multiple
              value={attendees.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                setAttendees(selected);
              }}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Hold Ctrl/Cmd to select multiple attendees
            </p>
          </div>

          {/* Recurring */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            <Repeat className="h-4 w-4" />
            <Label htmlFor="isRecurring" className="text-sm font-medium">
              Recurring event
            </Label>
          </div>

          {/* Recurrence Options */}
          {isRecurring && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurrenceEndDate">End Date (optional)</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {createEvent.isPending || updateEvent.isPending
                ? "Saving..."
                : eventId
                ? "Update Event"
                : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
