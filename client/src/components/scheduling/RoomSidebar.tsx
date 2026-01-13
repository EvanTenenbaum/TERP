/**
 * Room Sidebar Component
 * Sprint 4 Track D: MEET-047 - Multiple Rooms Management
 *
 * Displays list of rooms (meeting rooms & loading docks) with color coding
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { Building2, Truck, Plus, Settings } from "lucide-react";

interface RoomSidebarProps {
  selectedRoomId: number | null;
  onSelectRoom: (roomId: number | null) => void;
  onManageRooms?: () => void;
}

export function RoomSidebar({
  selectedRoomId,
  onSelectRoom,
  onManageRooms,
}: RoomSidebarProps) {
  const { data: rooms = [], isLoading } = trpc.scheduling.listRooms.useQuery({
    isActive: true,
  });

  const meetingRooms = rooms.filter(
    (r: { roomType: string }) => r.roomType === "meeting"
  );
  const loadingDocks = rooms.filter(
    (r: { roomType: string }) => r.roomType === "loading"
  );

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-gray-50 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Rooms</h3>
        {onManageRooms && (
          <button
            onClick={onManageRooms}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Manage Rooms"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* All Rooms Option */}
      <div className="p-2">
        <button
          onClick={() => onSelectRoom(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
            selectedRoomId === null
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="font-medium">All Rooms</span>
        </button>
      </div>

      {/* Meeting Rooms Section */}
      {meetingRooms.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Building2 className="h-3 w-3" />
            Meeting Rooms
          </div>
          <div className="space-y-1">
            {meetingRooms.map(room => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedRoomId === room.id
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-200 text-gray-700"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: room.color }}
                />
                <span className="font-medium truncate">{room.name}</span>
                {room.capacity && room.capacity > 1 && (
                  <span className="text-xs text-gray-500 ml-auto">
                    ({room.capacity})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Docks Section */}
      {loadingDocks.length > 0 && (
        <div className="px-4 py-2 mt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Truck className="h-3 w-3" />
            Loading Docks
          </div>
          <div className="space-y-1">
            {loadingDocks.map(room => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedRoomId === room.id
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-200 text-gray-700"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: room.color }}
                />
                <span className="font-medium truncate">{room.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {rooms.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No rooms configured</p>
            {onManageRooms && (
              <button
                onClick={onManageRooms}
                className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mx-auto"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomSidebar;
