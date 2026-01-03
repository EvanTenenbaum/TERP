import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarIcon, CheckCircle2, Clock } from "lucide-react";

type AppointmentCalendar = {
  id: number;
  name: string;
  description: string;
  appointmentTypes: Array<{
    id: number;
    name: string;
    description: string;
    durationMinutes: number;
    color: string | null;
  }>;
};

type SlotMap = Record<string, string[]>;

interface AppointmentBookingProps {
  clientId: number;
}

const getIsoRange = (): { start: string; end: string } => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 14);
  return {
    start: start.toISOString().split("T")[0] ?? "",
    end: end.toISOString().split("T")[0] ?? "",
  };
};

const AppointmentBooking = React.memo(function AppointmentBooking({
  clientId,
}: AppointmentBookingProps) {
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmation, setConfirmation] = useState<{
    requestId: number;
    date: string;
    time: string;
  } | null>(null);

  const dateRange = useMemo(getIsoRange, []);

  const { data: calendarsData, isLoading: calendarsLoading } =
    trpc.vipPortal.appointments.listCalendars.useQuery();

  const calendars = useMemo<AppointmentCalendar[]>(
    () => calendarsData ?? [],
    [calendarsData]
  );

  const slotsQueryEnabled = selectedCalendarId !== null && selectedTypeId !== null;
  const { data: slotsData, isFetching: slotsLoading, refetch: refetchSlots } =
    trpc.vipPortal.appointments.getSlots.useQuery(
      {
        calendarId: selectedCalendarId ?? 0,
        appointmentTypeId: selectedTypeId ?? 0,
        startDate: dateRange.start,
        endDate: dateRange.end,
      },
      { enabled: slotsQueryEnabled }
    );

  const requestMutation = trpc.vipPortal.appointments.request.useMutation();

  useEffect(() => {
    setSelectedDate("");
    setSelectedSlot("");
    setConfirmation(null);
  }, [selectedCalendarId, selectedTypeId]);

  const availableDates = useMemo<string[]>(
    () => (slotsData ? Object.keys(slotsData) : []),
    [slotsData]
  );

  const availableSlots = useMemo<string[]>(
    () => (selectedDate && slotsData ? (slotsData as SlotMap)[selectedDate] ?? [] : []),
    [selectedDate, slotsData]
  );

  const selectedCalendar = useMemo(
    () => calendars.find((calendar) => calendar.id === selectedCalendarId),
    [calendars, selectedCalendarId]
  );

  const selectedType = useMemo(
    () =>
      selectedCalendar?.appointmentTypes.find((type) => type.id === selectedTypeId) ?? null,
    [selectedCalendar, selectedTypeId]
  );

  const handleCalendarChange = useCallback((value: string) => {
    setSelectedCalendarId(Number(value));
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setSelectedTypeId(Number(value));
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot("");
  }, []);

  const handleSlotSelect = useCallback((slot: string) => {
    setSelectedSlot(slot);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCalendarId || !selectedTypeId || !selectedDate || !selectedSlot) {
      return;
    }
    const isoRequest = `${selectedDate}T${selectedSlot}:00.000Z`;
    const result = await requestMutation.mutateAsync({
      calendarId: selectedCalendarId,
      appointmentTypeId: selectedTypeId,
      requestedSlot: isoRequest,
      notes: notes.trim() || undefined,
    });
    setConfirmation({
      requestId: result.requestId,
      date: selectedDate,
      time: selectedSlot,
    });
    await refetchSlots();
  }, [
    notes,
    refetchSlots,
    requestMutation,
    selectedCalendarId,
    selectedDate,
    selectedSlot,
    selectedTypeId,
  ]);

  if (calendarsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Book Appointment</CardTitle>
          <CardDescription>Loading available calendars...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!calendars.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Book Appointment</CardTitle>
          <CardDescription>No appointment calendars are available right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Book Appointment
          </CardTitle>
          <CardDescription>
            Select a service, choose a time, and submit your request. You&apos;ll receive a
            confirmation once it&apos;s approved. Requests are linked to your account (Client #
            {clientId}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Service</p>
              <Select onValueChange={handleCalendarChange} value={selectedCalendarId?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id.toString()}>
                      {calendar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCalendar && (
                <p className="text-xs text-muted-foreground">{selectedCalendar.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Appointment Type</p>
              <Select onValueChange={handleTypeChange} value={selectedTypeId?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCalendar?.appointmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedType.durationMinutes} minutes · {selectedType.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available Dates</p>
            <div className="flex flex-wrap gap-2">
              {slotsLoading && <Badge variant="secondary">Loading slots...</Badge>}
              {!slotsLoading &&
                availableDates.map((date) => (
                  <Button
                    key={date}
                    variant={selectedDate === date ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDateSelect(date)}
                  >
                    {new Date(date).toLocaleDateString()}
                  </Button>
                ))}
              {!slotsLoading && availableDates.length === 0 && (
                <span className="text-sm text-muted-foreground">No dates currently open.</span>
              )}
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Available Times</p>
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSlotSelect(slot)}
                  >
                    {slot}
                  </Button>
                ))}
                {availableSlots.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No time slots available for this date.
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Notes (optional)</p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any details for the team to prepare."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedDate && selectedSlot
                ? `Requesting ${new Date(selectedDate).toLocaleDateString()} at ${selectedSlot}`
                : "Select a date and time to continue."}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                requestMutation.isPending ||
                !selectedCalendarId ||
                !selectedTypeId ||
                !selectedDate ||
                !selectedSlot
              }
            >
              {requestMutation.isPending ? "Submitting..." : "Request Appointment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {confirmation && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle className="text-lg">Request Submitted</CardTitle>
              <CardDescription>
                Request #{confirmation.requestId} for {confirmation.date} at {confirmation.time} has
                been received.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
});

export default AppointmentBooking;
