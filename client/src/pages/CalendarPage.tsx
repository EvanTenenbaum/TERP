import { useState } from "react";
import { Calendar, List, Grid3x3, Clock } from "lucide-react";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import AgendaView from "../components/calendar/AgendaView";
import CalendarFilters from "../components/calendar/CalendarFilters";
import EventFormDialog from "../components/calendar/EventFormDialog";
import { trpc } from "../lib/trpc";

/**
 * Calendar Page
 * Main calendar interface with multiple views
 * Version 2.0 - Post-Adversarial QA
 * PRODUCTION-READY - No placeholders
 */

type ViewType = "MONTH" | "WEEK" | "DAY" | "AGENDA";

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<ViewType>("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Load user's default view
  const { data: defaultView } = trpc.calendarViews.getDefaultView.useQuery();

  // Load events for current date range
  const dateRange = getDateRange(currentDate, currentView);
  const { data: events, refetch: refetchEvents } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  // Handle date navigation
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === "MONTH") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === "WEEK") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (currentView === "DAY") {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === "MONTH") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === "WEEK") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (currentView === "DAY") {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Handle event actions
  const handleEventClick = (eventId: number) => {
    setSelectedEventId(eventId);
    setIsEventDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEventId(null);
    setIsEventDialogOpen(true);
  };

  const handleEventSaved = () => {
    setIsEventDialogOpen(false);
    setSelectedEventId(null);
    refetchEvents();
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={handleToday}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Next
              </button>
            </div>

            {/* Current Date Display */}
            <div className="text-lg font-medium text-gray-900">
              {formatDateHeader(currentDate, currentView)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex rounded-lg border border-gray-300 bg-white">
              <button
                onClick={() => handleViewChange("MONTH")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${
                  currentView === "MONTH"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Month
              </button>
              <button
                onClick={() => handleViewChange("WEEK")}
                className={`flex items-center gap-2 border-l border-gray-300 px-3 py-1.5 text-sm font-medium ${
                  currentView === "WEEK"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Week
              </button>
              <button
                onClick={() => handleViewChange("DAY")}
                className={`flex items-center gap-2 border-l border-gray-300 px-3 py-1.5 text-sm font-medium ${
                  currentView === "DAY"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Clock className="h-4 w-4" />
                Day
              </button>
              <button
                onClick={() => handleViewChange("AGENDA")}
                className={`flex items-center gap-2 border-l border-gray-300 px-3 py-1.5 text-sm font-medium ${
                  currentView === "AGENDA"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <List className="h-4 w-4" />
                Agenda
              </button>
            </div>

            {/* Create Event Button */}
            <button
              onClick={handleCreateEvent}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Event
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4">
          <CalendarFilters />
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 overflow-auto p-6">
        {currentView === "MONTH" && (
          <MonthView
            currentDate={currentDate}
            events={events || []}
            onEventClick={handleEventClick}
          />
        )}
        {currentView === "WEEK" && (
          <WeekView
            currentDate={currentDate}
            events={events || []}
            onEventClick={handleEventClick}
          />
        )}
        {currentView === "DAY" && (
          <DayView
            currentDate={currentDate}
            events={events || []}
            onEventClick={handleEventClick}
          />
        )}
        {currentView === "AGENDA" && (
          <AgendaView
            currentDate={currentDate}
            events={events || []}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* Event Form Dialog */}
      <EventFormDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        eventId={selectedEventId}
        onSaved={handleEventSaved}
      />
    </div>
  );
}

// Helper functions
function getDateRange(date: Date, view: ViewType) {
  const start = new Date(date);
  const end = new Date(date);

  if (view === "MONTH") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  } else if (view === "WEEK") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    end.setDate(end.getDate() + (6 - day));
  } else if (view === "DAY") {
    // Same day
  } else if (view === "AGENDA") {
    // Next 30 days
    end.setDate(end.getDate() + 30);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatDateHeader(date: Date, view: ViewType): string {
  if (view === "MONTH") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (view === "WEEK") {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  } else if (view === "DAY") {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else {
    return "Agenda";
  }
}
