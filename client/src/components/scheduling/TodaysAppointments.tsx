/**
 * Today's Appointments Component
 * Sprint 4 Track D: MEET-046 - Live Appointments Tracking
 *
 * Displays today's appointments with check-in/check-out functionality
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import {
  Clock,
  User,
  CheckCircle,
  PlayCircle,
  XCircle,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface TodaysAppointmentsProps {
  selectedRoomId?: number | null;
  onRefresh?: () => void;
}

type CheckInStatus =
  | "waiting"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "no_show";

const statusConfig: Record<
  CheckInStatus,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  waiting: {
    label: "Waiting",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  checked_in: {
    label: "Checked In",
    color: "bg-blue-100 text-blue-800",
    icon: UserCheck,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-green-100 text-green-800",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-gray-100 text-gray-800",
    icon: CheckCircle,
  },
  no_show: {
    label: "No Show",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export function TodaysAppointments({
  selectedRoomId,
  onRefresh,
}: TodaysAppointmentsProps) {
  const utils = trpc.useUtils();

  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = trpc.scheduling.getTodaysAppointments.useQuery(
    { roomId: selectedRoomId ?? undefined },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const checkIn = trpc.scheduling.checkIn.useMutation({
    onSuccess: () => {
      utils.scheduling.getTodaysAppointments.invalidate();
      utils.scheduling.getLiveQueue.invalidate();
    },
  });

  const updateStatus = trpc.scheduling.updateCheckInStatus.useMutation({
    onSuccess: () => {
      utils.scheduling.getTodaysAppointments.invalidate();
      utils.scheduling.getLiveQueue.invalidate();
    },
  });

  const handleCheckIn = (calendarEventId: number, clientId?: number) => {
    checkIn.mutate({ calendarEventId, clientId });
  };

  const handleStatusChange = (checkInId: number, status: CheckInStatus) => {
    updateStatus.mutate({ id: checkInId, status });
  };

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentTime = format(now, "HH:mm:ss");

  // Sort appointments by start time
  const sortedAppointments = [...appointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  // Separate into upcoming, current, and past
  const upcoming = sortedAppointments.filter(a => a.startTime > currentTime);
  const current = sortedAppointments.filter(
    a => a.startTime <= currentTime && a.endTime >= currentTime
  );
  const past = sortedAppointments.filter(a => a.endTime < currentTime);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Today's Appointments
        </h3>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No appointments scheduled for today</p>
        </div>
      ) : (
        <div className="divide-y">
          {/* Current Appointments */}
          {current.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-green-700 mb-3">
                Now ({current.length})
              </h4>
              <div className="space-y-3">
                {current.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onCheckIn={handleCheckIn}
                    onStatusChange={handleStatusChange}
                    isHighlighted
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Appointments */}
          {upcoming.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-blue-700 mb-3">
                Upcoming ({upcoming.length})
              </h4>
              <div className="space-y-3">
                {upcoming.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onCheckIn={handleCheckIn}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Appointments */}
          {past.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                Earlier ({past.length})
              </h4>
              <div className="space-y-3">
                {past.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onCheckIn={handleCheckIn}
                    onStatusChange={handleStatusChange}
                    isPast
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AppointmentCardProps {
  appointment: {
    id: number;
    title: string | null;
    startTime: string;
    endTime: string;
    status: string;
    room: { id: number; name: string; color: string } | null;
    client: { id: number; name: string; teriCode: string } | null;
    event: { id: number } | null;
    checkIn: { id: number; status: string; checkInTime: Date | null } | null;
  };
  onCheckIn: (eventId: number, clientId?: number) => void;
  onStatusChange: (checkInId: number, status: CheckInStatus) => void;
  isHighlighted?: boolean;
  isPast?: boolean;
}

function AppointmentCard({
  appointment,
  onCheckIn,
  onStatusChange,
  isHighlighted,
  isPast,
}: AppointmentCardProps) {
  const checkInStatus = (appointment.checkIn?.status as CheckInStatus) || null;
  const config = checkInStatus ? statusConfig[checkInStatus] : null;
  const StatusIcon = config?.icon || Clock;

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        isHighlighted
          ? "bg-green-50 border-green-200"
          : isPast
            ? "bg-gray-50 border-gray-200 opacity-75"
            : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title & Client */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {appointment.title || "Appointment"}
            </span>
            {appointment.client && (
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <User className="h-3 w-3" />
                {appointment.client.name}
              </span>
            )}
          </div>

          {/* Time & Room */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {appointment.startTime.substring(0, 5)} -{" "}
              {appointment.endTime.substring(0, 5)}
            </span>
            {appointment.room && (
              <span className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: appointment.room.color }}
                />
                {appointment.room.name}
              </span>
            )}
          </div>

          {/* Status Badge */}
          {config && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {!appointment.checkIn && appointment.event && (
            <button
              onClick={() => {
                const eventId = appointment.event?.id;
                if (eventId) onCheckIn(eventId, appointment.client?.id);
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Check In
            </button>
          )}

          {appointment.checkIn && checkInStatus === "checked_in" && (
            <button
              onClick={() => {
                const checkInId = appointment.checkIn?.id;
                if (checkInId) onStatusChange(checkInId, "in_progress");
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Start
            </button>
          )}

          {appointment.checkIn && checkInStatus === "in_progress" && (
            <button
              onClick={() => {
                const checkInId = appointment.checkIn?.id;
                if (checkInId) onStatusChange(checkInId, "completed");
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Complete
            </button>
          )}

          {appointment.checkIn &&
            (checkInStatus === "checked_in" || checkInStatus === "waiting") && (
              <button
                onClick={() => {
                  const checkInId = appointment.checkIn?.id;
                  if (checkInId) onStatusChange(checkInId, "no_show");
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                No Show
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

export default TodaysAppointments;
