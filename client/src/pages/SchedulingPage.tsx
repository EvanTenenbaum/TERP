/**
 * Scheduling Page
 * Sprint 4 Track D: ENH-005 - Scheduling Workflow UI
 *
 * Main scheduling page with calendar views, room management, and live tracking
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Truck,
  Users,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";

import {
  RoomSidebar,
  RoomBookingModal,
  TodaysAppointments,
  LiveQueue,
  RoomManagementModal,
  DeliveryScheduleWidget,
  ShiftScheduleView,
} from "../components/scheduling";

type ViewMode = "week" | "month" | "day";
type TabMode = "calendar" | "shifts" | "deliveries";

export function SchedulingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [tabMode, setTabMode] = useState<TabMode>("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const utils = trpc.useUtils();

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case "week":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "month":
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case "day":
        return {
          start: currentDate,
          end: currentDate,
        };
    }
  };

  const { start, end } = getDateRange();

  // Fetch bookings for current view
  const { data: bookings = [], isLoading } =
    trpc.scheduling.listBookings.useQuery({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      roomId: selectedRoomId || undefined,
    });

  // Navigation handlers
  const handlePrev = () => {
    switch (viewMode) {
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "day":
        setCurrentDate(addDays(currentDate, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowBookingModal(true);
  };

  const handleRefresh = () => {
    utils.scheduling.listBookings.invalidate();
    utils.scheduling.getTodaysAppointments.invalidate();
    utils.scheduling.getLiveQueue.invalidate();
  };

  const getViewLabel = () => {
    switch (viewMode) {
      case "week":
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-7 w-7 text-blue-600" />
              Scheduling
            </h1>

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTabMode("calendar")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tabMode === "calendar"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </button>
              <button
                onClick={() => setTabMode("shifts")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tabMode === "shifts"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="h-4 w-4" />
                Shifts
              </button>
              <button
                onClick={() => setTabMode("deliveries")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tabMode === "deliveries"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Truck className="h-4 w-4" />
                Deliveries
              </button>
            </div>
          </div>

          {tabMode === "calendar" && (
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "day"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "week"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "month"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={handlePrev}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 text-sm font-medium hover:bg-white rounded transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 hover:bg-white rounded transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={() => {
                  setSelectedDate(new Date());
                  setShowBookingModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Book Room
              </button>
            </div>
          )}
        </div>

        {tabMode === "calendar" && (
          <div className="mt-2 text-lg font-semibold text-gray-700">
            {getViewLabel()}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {tabMode === "calendar" && (
          <>
            {/* Room Sidebar */}
            <RoomSidebar
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onManageRooms={() => setShowRoomManagement(true)}
            />

            {/* Calendar View */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {viewMode === "week" && (
                <WeekView
                  startDate={start}
                  bookings={bookings}
                  onDayClick={handleDayClick}
                  isLoading={isLoading}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  currentDate={currentDate}
                  bookings={bookings}
                  onDayClick={handleDayClick}
                  isLoading={isLoading}
                />
              )}
              {viewMode === "day" && (
                <DayView
                  date={currentDate}
                  bookings={bookings.filter(b =>
                    isSameDay(new Date(b.bookingDate), currentDate)
                  )}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Right Sidebar - Live Tracking */}
            <div className="w-80 border-l bg-white overflow-y-auto p-4 space-y-4">
              <TodaysAppointments
                selectedRoomId={selectedRoomId}
                onRefresh={handleRefresh}
              />
              <LiveQueue />
            </div>
          </>
        )}

        {tabMode === "shifts" && (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <ShiftScheduleView />
          </div>
        )}

        {tabMode === "deliveries" && (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <DeliveryScheduleWidget />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RoomBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        selectedDate={selectedDate}
        selectedRoomId={selectedRoomId}
        onSuccess={handleRefresh}
      />

      <RoomManagementModal
        isOpen={showRoomManagement}
        onClose={() => setShowRoomManagement(false)}
      />
    </div>
  );
}

// Week View Component
interface WeekViewProps {
  startDate: Date;
  bookings: Array<{
    id: number;
    bookingDate: Date;
    startTime: string;
    endTime: string;
    title: string | null;
    room: { id: number; name: string; color: string } | null;
    client: { id: number; name: string } | null;
  }>;
  onDayClick: (date: Date) => void;
  isLoading: boolean;
}

function WeekView({
  startDate,
  bookings,
  onDayClick,
  isLoading,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  if (isLoading) {
    return <div className="h-full animate-pulse bg-white rounded-lg" />;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b bg-gray-50">
        <div className="p-2 text-xs font-medium text-gray-500 border-r" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-gray-100 ${
              isToday(day) ? "bg-blue-50" : ""
            }`}
          >
            <div className="text-xs font-medium text-gray-500 uppercase">
              {format(day, "EEE")}
            </div>
            <div
              className={`text-lg font-semibold ${
                isToday(day) ? "text-blue-600" : "text-gray-900"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="overflow-y-auto max-h-[600px]">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
            <div className="p-2 text-xs text-gray-500 border-r text-right">
              {hour}:00
            </div>
            {days.map(day => {
              const dayBookings = bookings.filter(
                b =>
                  isSameDay(new Date(b.bookingDate), day) &&
                  parseInt(b.startTime.substring(0, 2)) === hour
              );
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className="p-1 border-r last:border-r-0 min-h-[60px] hover:bg-gray-50 cursor-pointer"
                >
                  {dayBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="text-xs p-1 rounded mb-1"
                      style={{
                        backgroundColor: booking.room?.color
                          ? `${booking.room.color}20`
                          : "#e5e7eb",
                        borderLeft: `3px solid ${booking.room?.color || "#9ca3af"}`,
                      }}
                    >
                      <div className="font-medium truncate">
                        {booking.title || "Booking"}
                      </div>
                      <div className="text-gray-500">
                        {booking.startTime.substring(0, 5)} -{" "}
                        {booking.endTime.substring(0, 5)}
                      </div>
                    </div>
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

// Month View Component
interface MonthViewProps {
  currentDate: Date;
  bookings: Array<{
    id: number;
    bookingDate: Date;
    title: string | null;
    room: { id: number; name: string; color: string } | null;
  }>;
  onDayClick: (date: Date) => void;
  isLoading: boolean;
}

function MonthView({
  currentDate,
  bookings,
  onDayClick,
  isLoading,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  if (isLoading) {
    return <div className="h-full animate-pulse bg-white rounded-lg" />;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div
            key={d}
            className="p-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          className="grid grid-cols-7 border-b last:border-b-0"
        >
          {week.map(day => {
            const dayBookings = bookings.filter(b =>
              isSameDay(new Date(b.bookingDate), day)
            );
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`min-h-[100px] p-2 border-r last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? "bg-gray-50" : ""
                } ${isToday(day) ? "bg-blue-50" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday(day)
                      ? "text-blue-600"
                      : isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map(booking => (
                    <div
                      key={booking.id}
                      className="text-xs p-1 rounded truncate"
                      style={{
                        backgroundColor: booking.room?.color
                          ? `${booking.room.color}20`
                          : "#e5e7eb",
                        borderLeft: `2px solid ${booking.room?.color || "#9ca3af"}`,
                      }}
                    >
                      {booking.title || "Booking"}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Day View Component
interface DayViewProps {
  date: Date;
  bookings: Array<{
    id: number;
    startTime: string;
    endTime: string;
    title: string | null;
    description: string | null;
    room: { id: number; name: string; color: string } | null;
    client: { id: number; name: string } | null;
  }>;
  isLoading: boolean;
}

function DayView({ date, bookings, isLoading }: DayViewProps) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  if (isLoading) {
    return <div className="h-full animate-pulse bg-white rounded-lg" />;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">
          {format(date, "EEEE, MMMM d, yyyy")}
        </h3>
        <p className="text-sm text-gray-500">{bookings.length} bookings</p>
      </div>

      <div className="divide-y max-h-[600px] overflow-y-auto">
        {hours.map(hour => {
          const hourBookings = bookings.filter(
            b => parseInt(b.startTime.substring(0, 2)) === hour
          );

          return (
            <div key={hour} className="flex">
              <div className="w-20 p-3 text-sm text-gray-500 border-r shrink-0">
                {hour}:00
              </div>
              <div className="flex-1 p-2 min-h-[80px]">
                {hourBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="p-3 rounded-lg mb-2"
                    style={{
                      backgroundColor: booking.room?.color
                        ? `${booking.room.color}20`
                        : "#f3f4f6",
                      borderLeft: `4px solid ${booking.room?.color || "#9ca3af"}`,
                    }}
                  >
                    <div className="font-medium text-gray-900">
                      {booking.title || "Booking"}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.startTime.substring(0, 5)} -{" "}
                        {booking.endTime.substring(0, 5)}
                      </span>
                      {booking.room && <span>{booking.room.name}</span>}
                      {booking.client && <span>{booking.client.name}</span>}
                    </div>
                    {booking.description && (
                      <div className="text-sm text-gray-500 mt-2">
                        {booking.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SchedulingPage;
