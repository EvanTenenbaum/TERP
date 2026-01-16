/**
 * Room Booking Modal Component
 * Sprint 4 Track D: ENH-005 - Scheduling Workflow UI
 *
 * Modal for creating room bookings with time slot picker
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, Clock, User, MapPin, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface RoomBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedRoomId?: number | null;
  onSuccess?: () => void;
}

export function RoomBookingModal({
  isOpen,
  onClose,
  selectedDate,
  selectedRoomId,
  onSuccess,
}: RoomBookingModalProps) {
  const [roomId, setRoomId] = useState<number | null>(selectedRoomId ?? null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: rooms = [] } = trpc.scheduling.listRooms.useQuery({
    isActive: true,
  });
  const { data: clientsResponse } = trpc.clients.list.useQuery(
    { search: clientSearch, limit: 10 },
    { enabled: clientSearch.length > 0 }
  );
  const clients = clientsResponse?.items || [];

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: availability } = trpc.scheduling.checkAvailability.useQuery(
    {
      roomId: roomId ?? 0,
      date: dateStr,
      startTime,
      endTime,
    },
    { enabled: !!roomId && !!startTime && !!endTime }
  );

  const { data: availableSlots } = trpc.scheduling.getAvailableSlots.useQuery(
    {
      roomId: roomId ?? 0,
      date: dateStr,
      slotDuration: 30,
    },
    { enabled: !!roomId }
  );

  const createBooking = trpc.scheduling.createBooking.useMutation({
    onSuccess: () => {
      utils.scheduling.listBookings.invalidate();
      utils.scheduling.getTodaysAppointments.invalidate();
      onSuccess?.();
      handleClose();
    },
  });

  // Reset roomId when selectedRoomId changes
  useEffect(() => {
    if (selectedRoomId !== undefined) {
      setRoomId(selectedRoomId);
    }
  }, [selectedRoomId]);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("10:00");
    setClientId(null);
    setClientSearch("");
    setNotes("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;

    createBooking.mutate({
      roomId,
      title: title || "Room Booking",
      description: description || undefined,
      bookingDate: dateStr,
      startTime,
      endTime,
      clientId: clientId || undefined,
      notes: notes || undefined,
    });
  };

  if (!isOpen) return null;

  const hasConflict = availability && !availability.available;

  // Generate time options (30-minute intervals from 8 AM to 6 PM)
  const timeOptions: string[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break;
      timeOptions.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Book Room</h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Date Display */}
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Room
              </label>
              <select
                value={roomId ?? ""}
                onChange={e => setRoomId(Number(e.target.value) || null)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a room...</option>
                <optgroup label="Meeting Rooms">
                  {rooms
                    .filter(r => r.roomType === "meeting")
                    .map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name}{" "}
                        {room.capacity ? `(${room.capacity} people)` : ""}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Loading Docks">
                  {rooms
                    .filter(r => r.roomType === "loading")
                    .map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Meeting title (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conflict Warning */}
            {hasConflict && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">
                  This time slot conflicts with an existing booking
                </span>
              </div>
            )}

            {/* Available Slots Quick Select */}
            {roomId && availableSlots && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Slots
                </label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {availableSlots
                    .filter(s => s.available)
                    .slice(0, 12)
                    .map(slot => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => {
                          setStartTime(slot.startTime.substring(0, 5));
                          setEndTime(slot.endTime.substring(0, 5));
                        }}
                        className={`px-2 py-1 text-xs rounded border ${
                          startTime === slot.startTime.substring(0, 5)
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {slot.startTime.substring(0, 5)}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Client (optional)
              </label>
              {clientId ? (
                <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
                  <span>
                    {clients.find(c => c.id === clientId)?.name ||
                      "Selected Client"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setClientId(null);
                      setClientSearch("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {clientSearch && clients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {clients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setClientId(client.id);
                            setClientSearch("");
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          <span className="font-medium">{client.name}</span>
                          {client.teriCode && (
                            <span className="text-gray-500 ml-2">
                              ({client.teriCode})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!roomId || hasConflict || createBooking.isPending}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBooking.isPending ? "Booking..." : "Book Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RoomBookingModal;
