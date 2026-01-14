/**
 * Live Queue Component
 * Sprint 4 Track D: MEET-046 - Live Appointments Tracking
 *
 * Real-time queue display for checked-in clients
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { Users, Clock, PlayCircle, CheckCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function LiveQueue() {
  const utils = trpc.useUtils();

  const {
    data: queue = [],
    isLoading,
    refetch,
  } = trpc.scheduling.getLiveQueue.useQuery(undefined, {
    refetchInterval: 15000, // Refresh every 15 seconds for live updates
  });

  const updateStatus = trpc.scheduling.updateCheckInStatus.useMutation({
    onSuccess: () => {
      utils.scheduling.getLiveQueue.invalidate();
      utils.scheduling.getTodaysAppointments.invalidate();
    },
  });

  const handleStart = (checkInId: number) => {
    updateStatus.mutate({ id: checkInId, status: "in_progress" });
  };

  const handleComplete = (checkInId: number) => {
    updateStatus.mutate({ id: checkInId, status: "completed" });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const waiting = queue.filter(
    q => q.status === "waiting" || q.status === "checked_in"
  );
  const inProgress = queue.filter(q => q.status === "in_progress");

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Live Queue
          {queue.length > 0 && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {queue.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No clients in queue</p>
          <p className="text-sm mt-1">Check in clients to see them here</p>
        </div>
      ) : (
        <div className="divide-y">
          {/* In Progress Section */}
          {inProgress.length > 0 && (
            <div className="p-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-green-700 mb-3">
                <PlayCircle className="h-4 w-4" />
                In Progress ({inProgress.length})
              </h4>
              <div className="space-y-2">
                {inProgress.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onComplete={handleComplete}
                    isInProgress
                  />
                ))}
              </div>
            </div>
          )}

          {/* Waiting Section */}
          {waiting.length > 0 && (
            <div className="p-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-3">
                <Clock className="h-4 w-4" />
                Waiting ({waiting.length})
              </h4>
              <div className="space-y-2">
                {waiting.map((item, index) => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onStart={handleStart}
                    position={index + 1}
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

interface QueueItemProps {
  item: {
    id: number;
    status: string;
    checkInTime: Date | null;
    queuePosition: number | null;
    client: { id: number; name: string; teriCode: string } | null;
    event: { id: number; title: string } | null;
    room: { id: number; name: string; color: string } | null;
  };
  onStart?: (id: number) => void;
  onComplete?: (id: number) => void;
  position?: number;
  isInProgress?: boolean;
}

function QueueItem({
  item,
  onStart,
  onComplete,
  position,
  isInProgress,
}: QueueItemProps) {
  const waitTime = item.checkInTime
    ? formatDistanceToNow(new Date(item.checkInTime), { addSuffix: false })
    : null;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isInProgress
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Position Number */}
        {position !== undefined && (
          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-sm">
            {position}
          </div>
        )}

        {/* In Progress Icon */}
        {isInProgress && (
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
            <PlayCircle className="h-5 w-5" />
          </div>
        )}

        {/* Client Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {item.client?.name || "Walk-in"}
            </span>
            {item.client?.teriCode && (
              <span className="text-xs text-gray-500">
                ({item.client.teriCode})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            {item.event?.title && <span>{item.event.title}</span>}
            {item.room && (
              <span className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.room.color }}
                />
                {item.room.name}
              </span>
            )}
            {waitTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {waitTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onStart && (
          <button
            onClick={() => onStart(item.id)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <PlayCircle className="h-3 w-3" />
            Start
          </button>
        )}
        {onComplete && (
          <button
            onClick={() => onComplete(item.id)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

export default LiveQueue;
