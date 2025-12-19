import { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, Users, Bell, Repeat, Tag } from "lucide-react";
import { trpc } from "../../lib/trpc";

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

  // Recurrence state
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("WEEKLY");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Queries - handle paginated response
  const { data: users } = trpc.userManagement.listUsers.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);

  // Mutations
  const createEvent = trpc.calendar.createEvent.useMutation();
  const updateEvent = trpc.calendar.updateEvent.useMutation();

  // Load event data if editing
  const { data: eventData } = trpc.calendar.getEventById.useQuery(
    { id: eventId!, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { enabled: !!eventId }
  );

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
    } else {
      // Reset form for new event
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
    }
  }, [eventData, initialDate, initialClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData: any = {
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
      eventData.recurrenceRule = {
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
          updates: eventData,
        });
      } else {
        await createEvent.mutateAsync(eventData);
      }
      onSaved();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {eventId ? "Edit Event" : "Create Event"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Event title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Event description"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Event location"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* All Day Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  All day event
                </span>
              </label>
            </div>

            {/* Time (if not all day) */}
            {!isAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Client
              </label>
              <select
                value={clientId || ""}
                onChange={(e) => setClientId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name || `Client #${client.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Meeting Type and Event Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meeting Type *
                </label>
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="ACCOUNTING">Accounting</option>
                  <option value="CLIENTS">Clients</option>
                  <option value="VENDORS">Vendors</option>
                  <option value="ORDERS">Orders</option>
                  <option value="SAMPLES">Samples</option>
                  <option value="COMPLIANCE">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event Type *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="MEETING">Meeting</option>
                  <option value="TASK">Task</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="PAYMENT_DUE">Payment Due</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="AUDIT">Audit</option>
                  <option value="INTAKE">Intake</option>
                  <option value="PHOTOGRAPHY">Photography</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Visibility *
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="PRIVATE">Private</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Users className="inline h-4 w-4 mr-1" />
                Attendees
              </label>
              <select
                multiple
                value={attendees.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setAttendees(selected);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                size={5}
              >
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple attendees
              </p>
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Repeat className="h-4 w-4" />
                <span className="text-sm font-medium text-gray-700">
                  Recurring event
                </span>
              </label>
            </div>

            {/* Recurrence Options */}
            {isRecurring && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Frequency
                      </label>
                      <select
                        value={recurrenceFrequency}
                        onChange={(e) => setRecurrenceFrequency(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Interval
                      </label>
                      <input
                        type="number"
                        value={recurrenceInterval}
                        onChange={(e) =>
                          setRecurrenceInterval(parseInt(e.target.value))
                        }
                        min="1"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending || updateEvent.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createEvent.isPending || updateEvent.isPending
                ? "Saving..."
                : eventId
                ? "Update Event"
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
