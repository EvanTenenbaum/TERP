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

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: number) => void;
  onDateClick?: (date: Date) => void;
}

export default function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: Event[];
    }> = [];
    
    // Add previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date, events),
      });
    }
    
    // Add current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        events: getEventsForDate(date, events),
      });
    }
    
    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date, events),
      });
    }
    
    return days;
  }, [currentDate, events]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={`week-${index}`}
            onClick={() => onDateClick?.(day.date)}
            className={`min-h-[120px] border-b border-r border-gray-200 p-2 last:border-r-0 cursor-pointer hover:bg-gray-100 ${
              !day.isCurrentMonth ? "bg-gray-50" : ""
            } ${day.isToday ? "bg-blue-50" : ""}`}
          >
            {/* Date Number */}
            <div
              className={`mb-1 text-sm font-medium ${
                day.isToday
                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
                  : day.isCurrentMonth
                  ? "text-gray-900"
                  : "text-gray-400"
              }`}
            >
              {day.date.getDate()}
            </div>

            {/* Events */}
            <div className="space-y-1">
              {day.events.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event.id);
                  }}
                  className={`w-full truncate rounded px-2 py-1 text-left text-xs font-medium ${getEventColorClass(
                    event
                  )} hover:opacity-80`}
                >
                  {event.startTime && (
                    <span className="mr-1">
                      {formatTime(event.startTime)}
                    </span>
                  )}
                  {event.title}
                </button>
              ))}
              {day.events.length > 3 && (
                <div className="px-2 text-xs text-gray-500">
                  +{day.events.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getEventsForDate(date: Date, events: Event[]): Event[] {
  const dateStr = date.toISOString().split("T")[0];
  return events.filter((event) => {
    // Extract date part from ISO datetime strings
    const eventStartDate = event.startDate.split("T")[0];
    const eventEndDate = event.endDate.split("T")[0];
    return eventStartDate <= dateStr && eventEndDate >= dateStr;
  });
}

function getEventColorClass(event: Event): string {
  // Priority-based colors
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

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${ampm}`;
}
