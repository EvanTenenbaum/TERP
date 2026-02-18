import { useState } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Clock, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AvailabilitySlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * CalendarAvailabilitySettings Component
 * CAL-002: Availability and blocked dates management
 * Extracted from CalendarSettings.tsx for better maintainability
 */

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function CalendarAvailabilitySettings() {
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(
    null
  );
  const [blockedDateInput, setBlockedDateInput] = useState("");
  const [blockedReasonInput, setBlockedReasonInput] = useState("");
  const [deleteBlockedConfirm, setDeleteBlockedConfirm] = useState<
    number | null
  >(null);

  const { data: calendars } = trpc.calendarsManagement.list.useQuery({});
  const { data: availability, refetch: refetchAvailability } =
    trpc.calendarsManagement.listAvailability.useQuery(
      { calendarId: selectedCalendarId ?? 0 },
      { enabled: !!selectedCalendarId }
    );
  const { data: blockedDates, refetch: refetchBlocked } =
    trpc.calendarsManagement.listBlockedDates.useQuery(
      { calendarId: selectedCalendarId ?? 0 },
      { enabled: !!selectedCalendarId }
    );

  const setAvailabilityMutation =
    trpc.calendarsManagement.setAvailability.useMutation({
      onSuccess: () => {
        toast.success("Availability updated");
        refetchAvailability();
      },
      onError: error => {
        toast.error(error.message || "Failed to update availability");
      },
    });

  const addBlockedMutation =
    trpc.calendarsManagement.addBlockedDate.useMutation({
      onSuccess: () => {
        toast.success("Blocked date added");
        setBlockedDateInput("");
        setBlockedReasonInput("");
        refetchBlocked();
      },
      onError: error => {
        toast.error(error.message || "Failed to add blocked date");
      },
    });

  const removeBlockedMutation =
    trpc.calendarsManagement.removeBlockedDate.useMutation({
      onSuccess: () => {
        toast.success("Blocked date removed");
        refetchBlocked();
      },
      onError: error => {
        toast.error(error.message || "Failed to remove blocked date");
      },
    });

  // Auto-select first calendar if none selected
  if (!selectedCalendarId && calendars && calendars.length > 0) {
    setSelectedCalendarId(calendars[0].id);
  }

  // Group availability by day
  const availabilityByDay: Record<
    number,
    Array<{ id: number; startTime: string; endTime: string }>
  > = {};
  for (let i = 0; i < 7; i++) {
    availabilityByDay[i] = [];
  }
  availability?.forEach((slot: AvailabilitySlot) => {
    availabilityByDay[slot.dayOfWeek]?.push({
      id: slot.id,
      startTime: slot.startTime?.slice(0, 5) || "",
      endTime: slot.endTime?.slice(0, 5) || "",
    });
  });

  const handleAddSlot = (dayOfWeek: number) => {
    const currentSlots = availabilityByDay[dayOfWeek] || [];
    const newSlots = [
      ...currentSlots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      { startTime: "09:00", endTime: "17:00" },
    ];
    setAvailabilityMutation.mutate({
      calendarId: selectedCalendarId ?? 0,
      dayOfWeek,
      slots: newSlots,
    });
  };

  const handleRemoveSlot = (dayOfWeek: number, index: number) => {
    const currentSlots = availabilityByDay[dayOfWeek] || [];
    const newSlots = currentSlots
      .filter((_, i) => i !== index)
      .map(s => ({ startTime: s.startTime, endTime: s.endTime }));
    setAvailabilityMutation.mutate({
      calendarId: selectedCalendarId ?? 0,
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
      calendarId: selectedCalendarId ?? 0,
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
            onChange={e => setSelectedCalendarId(Number(e.target.value))}
          >
            {calendars?.map((cal: { id: number; name: string }) => (
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
                  <div
                    key={`${day}-${slot.startTime}-${slot.endTime}`}
                    className="flex items-center gap-2"
                  >
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={e =>
                        handleUpdateSlot(
                          dayIndex,
                          slotIndex,
                          "startTime",
                          e.target.value
                        )
                      }
                      className="w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={e =>
                        handleUpdateSlot(
                          dayIndex,
                          slotIndex,
                          "endTime",
                          e.target.value
                        )
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
                  <span className="text-sm text-muted-foreground">
                    Unavailable
                  </span>
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
              onChange={e => setBlockedDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="blocked-reason">Reason (optional)</Label>
            <Input
              id="blocked-reason"
              value={blockedReasonInput}
              onChange={e => setBlockedReasonInput(e.target.value)}
              placeholder="e.g., Company Holiday"
            />
          </div>
          <Button
            onClick={() =>
              addBlockedMutation.mutate({
                calendarId: selectedCalendarId ?? 0,
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
            <div
              key={blocked.id}
              className="p-3 flex items-center justify-between"
            >
              <div>
                <span className="font-medium">
                  {new Date(blocked.date).toLocaleDateString()}
                </span>
                {blocked.reason && (
                  <span className="ml-2 text-muted-foreground">
                    - {blocked.reason}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteBlockedConfirm(blocked.id)}
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
      <ConfirmDialog
        open={deleteBlockedConfirm !== null}
        onOpenChange={open => !open && setDeleteBlockedConfirm(null)}
        title="Delete Blocked Date"
        description="Are you sure you want to remove this blocked date? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteBlockedConfirm) {
            removeBlockedMutation.mutate({ id: deleteBlockedConfirm });
          }
          setDeleteBlockedConfirm(null);
        }}
      />
    </div>
  );
}

export default CalendarAvailabilitySettings;
