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
  description?: string | null;
  location?: string | null;
}

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: number) => void;
}

export default function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  // Time slots (24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        label: formatHour(hour),
      });
    }
    return slots;
  }, []);

  // Filter events for current day
  const dayEvents = useMemo(() => {
    const dateStr = currentDate.toISOString().split("T")[0];
    return events.filter((event) => {
      // Extract date part from ISO datetime strings
      const eventStartDate = event.startDate.split("T")[0];
      const eventEndDate = event.endDate.split("T")[0];
      return eventStartDate <= dateStr && eventEndDate >= dateStr;
    });
  }, [currentDate, events]);

  // Separate all-day and timed events
  const allDayEvents = dayEvents.filter((e) => !e.startTime);
  const timedEvents = dayEvents.filter((e) => e.startTime);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="text-lg font-semibold text-gray-900">
          {currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
            All Day
          </div>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event.id)}
                className={`w-full rounded-lg p-3 text-left ${getEventColorClass(
                  event
                )} hover:opacity-80`}
              >
                <div className="font-medium">{event.title}</div>
                {event.location && (
                  <div className="mt-1 text-xs opacity-75">{event.location}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((slot) => {
          const hourEvents = timedEvents.filter((event) => {
            if (!event.startTime) return false;
            const eventHour = parseInt(event.startTime.split(":")[0]);
            return eventHour === slot.hour;
          });

          return (
            <div
              key={slot.hour}
              className="grid grid-cols-12 border-b border-gray-200"
            >
              {/* Time label */}
              <div className="col-span-2 border-r border-gray-200 p-3 text-right text-sm text-gray-500">
                {slot.label}
              </div>

              {/* Events column */}
              <div className="col-span-10 min-h-[80px] p-2">
                {hourEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event.id)}
                    className={`mb-2 w-full rounded-lg p-3 text-left ${getEventColorClass(
                      event
                    )} hover:opacity-80`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{event.title}</div>
                        {event.description && (
                          <div className="mt-1 text-xs opacity-75 line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 text-xs font-medium">
                        {event.startTime && formatTime(event.startTime)}
                        {event.endTime && ` - ${formatTime(event.endTime)}`}
                      </div>
                    </div>
                    {event.location && (
                      <div className="mt-2 text-xs opacity-75">
                        📍 {event.location}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-white bg-opacity-50 px-2 py-0.5 text-xs font-medium">
                        {event.eventType}
                      </span>
                      <span className="rounded-full bg-white bg-opacity-50 px-2 py-0.5 text-xs font-medium">
                        {event.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper functions
function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
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
