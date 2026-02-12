import { useMemo } from "react";

interface Event {
  id: number;
  title: string;
  startDate: string;
  startTime?: string | null;
  endDate: string;
  endTime?: string | null;
  eventType: string;
  status: string;
  priority: string;
}

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: number) => void;
}

export default function WeekView({ currentDate, events, onEventClick }: WeekViewProps) {
  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }, [currentDate]);

  // Time slots (business hours: 7 AM to 7 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 19; hour++) {
      slots.push({
        hour,
        label: formatHour(hour),
      });
    }
    return slots;
  }, []);

  const today = new Date();

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
        <div className="border-r border-gray-200 p-3"></div>
        {weekDays.map((day, _dayIdx) => {
          const isToday =
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();

          return (
            <div
              key={`weekday-${day.toISOString()}`}
              className={`border-r border-gray-200 p-3 text-center last:border-r-0 ${
                isToday ? "bg-blue-50" : ""
              }`}
            >
              <div className="text-xs font-medium text-gray-500">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`mt-1 text-lg font-semibold ${
                  isToday
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white mx-auto"
                    : "text-gray-900"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((slot) => (
          <div key={slot.hour} className="grid grid-cols-8 border-b border-gray-200">
            {/* Time label */}
            <div className="border-r border-gray-200 p-2 text-right text-xs text-gray-500">
              {slot.label}
            </div>

            {/* Day columns */}
            {weekDays.map((day, _dayIndex) => {
              const dayEvents = getEventsForDayAndHour(day, slot.hour, events);

              return (
                <div
                  key={`timeslot-${day.toISOString()}-${slot.hour}`}
                  className="relative min-h-[60px] border-r border-gray-200 p-1 last:border-r-0"
                >
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event.id)}
                      className={`mb-1 w-full truncate rounded px-2 py-1 text-left text-xs font-medium ${getEventColorClass(
                        event
                      )} hover:opacity-80`}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getEventsForDayAndHour(date: Date, hour: number, events: Event[]): Event[] {
  const dateStr = date.toISOString().split("T")[0];

  return events.filter((event) => {
    // Extract date part from ISO datetime string
    const eventStartDate = event.startDate.split("T")[0];
    if (eventStartDate !== dateStr) return false;

    if (event.startTime) {
      const eventHour = parseInt(event.startTime.split(":")[0]);
      return eventHour === hour;
    }

    // All-day events show in first hour
    return hour === 0;
  });
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getEventColorClass(event: Event): string {
  if (event.priority === "URGENT") {
    return "bg-red-100 text-red-800";
  } else if (event.priority === "HIGH") {
    return "bg-orange-100 text-orange-800";
  } else if (event.priority === "MEDIUM") {
    return "bg-blue-100 text-blue-800";
  } else {
    return "bg-gray-100 text-gray-800";
  }
}
