import { useState } from "react";
import { Calendar, List, Grid3x3, Clock, Inbox, Palmtree, AlertCircle } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import AgendaView from "../components/calendar/AgendaView";
import CalendarFilters from "../components/calendar/CalendarFilters";
import EventFormDialog from "../components/calendar/EventFormDialog";
import AppointmentRequestsList from "../components/calendar/AppointmentRequestsList";
import AppointmentRequestModal from "../components/calendar/AppointmentRequestModal";
import TimeOffRequestsList from "../components/calendar/TimeOffRequestsList";
import { trpc } from "../lib/trpc";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DatabaseErrorState,
  ErrorState,
  isDatabaseError,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Card } from "@/components/ui/card";

/**
 * Calendar Page
 * Main calendar interface with multiple views
 * Version 2.0 - Post-Adversarial QA
 * PRODUCTION-READY - No placeholders
 */

type ViewType = "MONTH" | "WEEK" | "DAY" | "AGENDA";
type TabType = "calendar" | "requests" | "timeoff";

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<TabType>("calendar");
  const [currentView, setCurrentView] = useState<ViewType>("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Get pending counts for badges
  const { data: pendingRequestCount } = trpc.appointmentRequests.getPendingCount.useQuery({});
  const { data: teamTimeOffCount } = trpc.timeOffRequests.getTeamPendingCount.useQuery();

  // Load user's default view (for future use)
  // const { data: defaultView } = trpc.calendarViews.getDefaultView.useQuery();

  // Load events for current date range
  const dateRange = getDateRange(currentDate, currentView);
  const {
    data: eventsData,
    refetch: refetchEvents,
    isLoading: eventsLoading,
    error: eventsError,
    isError: isEventsError,
  } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Handle the response which could be an array or an object with data property
  const events = Array.isArray(eventsData)
    ? eventsData
    : eventsData?.data || [];

  // Convert events to the format expected by view components
  const formattedEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    startDate:
      typeof event.startDate === "string"
        ? event.startDate
        : event.startDate.toISOString().split("T")[0],
    endDate:
      typeof event.endDate === "string"
        ? event.endDate
        : event.endDate.toISOString().split("T")[0],
    startTime: event.startTime,
    endTime: event.endTime,
    eventType: "eventType" in event ? event.eventType : "MEETING",
    status: "status" in event ? event.status : "SCHEDULED",
    priority: "priority" in event ? event.priority : "MEDIUM",
    module: "module" in event ? (event.module || "") : "",
  }));

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
    setSelectedDate(null);
    setIsEventDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedEventId(null);
    setSelectedDate(date);
    setIsEventDialogOpen(true);
  };

  const handleEventSaved = () => {
    setIsEventDialogOpen(false);
    setSelectedEventId(null);
    refetchEvents();
  };

  // CRITICAL: Handle database errors gracefully (Wave 3 finding)
  if (isEventsError && activeTab === "calendar") {
    console.error("[CalendarPage] API Error:", eventsError);

    const isDbError = isDatabaseError(eventsError);

    return (
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <div className="border-b bg-card px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BackButton label="Back to Dashboard" to="/" />
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Calendar</h1>
            </div>
            <button
              onClick={handleCreateEvent}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              Create Event
            </button>
          </div>
        </div>

        {/* Error State */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <Card className="p-6">
            {isDbError ? (
              <DatabaseErrorState
                entity="calendar events"
                onRetry={() => refetchEvents()}
                errorMessage={eventsError?.message}
              />
            ) : (
              <ErrorState
                title="Failed to load calendar"
                description={eventsError?.message || "An error occurred while loading calendar events."}
                onRetry={() => refetchEvents()}
                showSupport
              />
            )}
          </Card>
        </div>

        {/* Event Form Dialog - keep available for retry */}
        <EventFormDialog
          isOpen={isEventDialogOpen}
          onClose={() => setIsEventDialogOpen(false)}
          eventId={selectedEventId}
          initialDate={selectedDate}
          onSaved={handleEventSaved}
        />
      </div>
    );
  }

  // Check if calendar has events
  const hasEvents = events && events.length > 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3">
              <BackButton label="Back to Dashboard" to="/" />
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Calendar</h1>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent sm:px-3 sm:text-sm"
                aria-label="Previous period"
              >
                Previous
              </button>
              <button
                onClick={handleToday}
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent sm:px-3 sm:text-sm"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent sm:px-3 sm:text-sm"
                aria-label="Next period"
              >
                Next
              </button>
            </div>

            {/* Current Date Display */}
            <div className="text-base font-medium text-foreground sm:text-lg">
              {formatDateHeader(currentDate, currentView)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Switcher */}
            <div className="flex rounded-lg border border-border bg-card">
              <button
                onClick={() => handleViewChange("MONTH")}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm ${
                  currentView === "MONTH"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
                aria-pressed={currentView === "MONTH"}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Month</span>
              </button>
              <button
                onClick={() => handleViewChange("WEEK")}
                className={`flex items-center gap-1 border-l border-border px-2 py-1.5 text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm ${
                  currentView === "WEEK"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
                aria-pressed={currentView === "WEEK"}
              >
                <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Week</span>
              </button>
              <button
                onClick={() => handleViewChange("DAY")}
                className={`flex items-center gap-1 border-l border-border px-2 py-1.5 text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm ${
                  currentView === "DAY"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
                aria-pressed={currentView === "DAY"}
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Day</span>
              </button>
              <button
                onClick={() => handleViewChange("AGENDA")}
                className={`flex items-center gap-1 border-l border-border px-2 py-1.5 text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm ${
                  currentView === "AGENDA"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
                aria-pressed={currentView === "AGENDA"}
              >
                <List className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Agenda</span>
              </button>
            </div>

            {/* Create Event Button */}
            <button
              onClick={handleCreateEvent}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              Create Event
            </button>
          </div>
        </div>

        {/* Filters - only show on calendar tab */}
        {activeTab === "calendar" && (
          <div className="mt-3 sm:mt-4">
            <CalendarFilters />
          </div>
        )}

        {/* Tab Bar */}
        <div className="mt-3 flex border-b border-border sm:mt-4">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "calendar"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Requests</span>
            {pendingRequestCount && pendingRequestCount.count > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {pendingRequestCount.count}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("timeoff")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "timeoff"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Palmtree className="h-4 w-4" />
            <span className="hidden sm:inline">Time Off</span>
            {teamTimeOffCount && teamTimeOffCount.count > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {teamTimeOffCount.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <>
            {/* Loading state */}
            {eventsLoading && (
              <LoadingState message="Loading calendar events..." />
            )}

            {/* Empty state alert - show when no events but not loading or error */}
            {!hasEvents && !eventsLoading && !isEventsError && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No events this period</AlertTitle>
                <AlertDescription>
                  Create an appointment or task to see it on your calendar.
                </AlertDescription>
              </Alert>
            )}

            {!eventsLoading && currentView === "MONTH" && (
              <MonthView
                currentDate={currentDate}
                events={formattedEvents}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            )}
            {!eventsLoading && currentView === "WEEK" && (
              <WeekView
                currentDate={currentDate}
                events={formattedEvents}
                onEventClick={handleEventClick}
              />
            )}
            {!eventsLoading && currentView === "DAY" && (
              <DayView
                currentDate={currentDate}
                events={formattedEvents}
                onEventClick={handleEventClick}
              />
            )}
            {!eventsLoading && currentView === "AGENDA" && (
              <AgendaView
                currentDate={currentDate}
                events={formattedEvents}
                onEventClick={handleEventClick}
              />
            )}
          </>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <AppointmentRequestsList
            onSelectRequest={(id) => {
              setSelectedRequestId(id);
              setIsRequestModalOpen(true);
            }}
          />
        )}

        {/* Time Off Tab */}
        {activeTab === "timeoff" && (
          <TimeOffRequestsList isAdmin={true} />
        )}
      </div>

      {/* Event Form Dialog */}
      <EventFormDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        eventId={selectedEventId}
        initialDate={selectedDate}
        onSaved={handleEventSaved}
      />

      {/* Appointment Request Modal */}
      <AppointmentRequestModal
        requestId={selectedRequestId}
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedRequestId(null);
        }}
        onAction={() => {
          // Refetch happens inside the component
        }}
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
