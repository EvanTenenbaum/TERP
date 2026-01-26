import { useMemo } from "react";
import { Calendar, MapPin, Clock } from "lucide-react";

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
  module: string;
}

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: number) => void;
}

export default function AgendaView({
  currentDate: _currentDate,
  events,
  onEventClick,
}: AgendaViewProps) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: Event[] } = {};

    events.forEach(event => {
      const dateKey = event.startDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    // Sort each group by time
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
    });

    // Sort dates
    const sortedDates = Object.keys(groups).sort();

    return sortedDates.map(date => ({
      date,
      events: groups[date],
    }));
  }, [events]);

  if (groupedEvents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No upcoming events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(group => (
        <div
          key={group.date}
          className="rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          {/* Date Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">
              {formatDateHeader(group.date)}
            </div>
          </div>

          {/* Events List */}
          <div className="divide-y divide-gray-200">
            {group.events.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick(event.id)}
                className="w-full p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start gap-4">
                  {/* Time */}
                  <div className="flex-shrink-0 w-20 text-right">
                    {event.startTime ? (
                      <div className="text-sm font-medium text-gray-900">
                        {formatTime(event.startTime)}
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-gray-500">
                        All Day
                      </div>
                    )}
                    {event.endTime && (
                      <div className="text-xs text-gray-500">
                        {formatTime(event.endTime)}
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {event.title}
                        </div>
                        {event.description && (
                          <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </div>

                      {/* Priority Badge */}
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getPriorityBadgeClass(
                          event.priority
                        )}`}
                      >
                        {event.priority}
                      </span>
                    </div>

                    {/* Meta Information */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.eventType}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.module}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions
function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) {
    return (
      "Today, " +
      date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
    );
  } else if (isTomorrow) {
    return (
      "Tomorrow, " +
      date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
    );
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-800";
    case "HIGH":
      return "bg-orange-100 text-orange-800";
    case "MEDIUM":
      return "bg-blue-100 text-blue-800";
    case "LOW":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
