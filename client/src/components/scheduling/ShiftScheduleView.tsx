/**
 * Shift Schedule View Component
 * Sprint 4 Track D: MEET-050 - Shift/Vacation Tracking
 *
 * Weekly schedule view with shift creation and templates
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Coffee,
  X,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";

type ShiftStatus =
  | "scheduled"
  | "started"
  | "completed"
  | "absent"
  | "cancelled";

const shiftStatusColors: Record<ShiftStatus, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  started: "bg-green-100 border-green-300 text-green-800",
  completed: "bg-gray-100 border-gray-300 text-gray-800",
  absent: "bg-red-100 border-red-300 text-red-800",
  cancelled: "bg-gray-100 border-gray-200 text-gray-500",
};

interface ShiftScheduleViewProps {
  userId?: number;
}

export function ShiftScheduleView({ userId }: ShiftScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const utils = trpc.useUtils();

  const weekEnd = addDays(currentWeekStart, 6);

  const { data: shifts = [], isLoading } = trpc.scheduling.listShifts.useQuery({
    startDate: format(currentWeekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
    userId: userId,
  });

  const { data: templates = [] } =
    trpc.scheduling.listShiftTemplates.useQuery();

  const { data: usersData = [] } = trpc.users.list.useQuery(undefined, {
    enabled: !userId,
  });
  const users = usersData;

  const createShift = trpc.scheduling.createShift.useMutation({
    onSuccess: () => {
      utils.scheduling.listShifts.invalidate();
      setShowCreateModal(false);
      setSelectedDate(null);
    },
  });

  const deleteShift = trpc.scheduling.deleteShift.useMutation({
    onSuccess: () => {
      utils.scheduling.listShifts.invalidate();
    },
  });

  const applyTemplate = trpc.scheduling.applyShiftTemplate.useMutation({
    onSuccess: () => {
      utils.scheduling.listShifts.invalidate();
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

  const getShiftsForDay = (date: Date) =>
    shifts.filter(s => isSameDay(new Date(s.shiftDate), date));

  const handlePrevWeek = () =>
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () =>
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Shift Schedule
        </h3>

        <div className="flex items-center gap-2">
          {/* Week Navigation */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 text-sm font-medium hover:bg-white rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => utils.scheduling.listShifts.invalidate()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Label */}
      <div className="px-4 py-2 bg-gray-50 border-b text-center">
        <span className="text-sm font-medium text-gray-700">
          {format(currentWeekStart, "MMMM d")} -{" "}
          {format(weekEnd, "MMMM d, yyyy")}
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={`text-center py-2 border-r last:border-r-0 ${
              isSameDay(day, new Date())
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700"
            }`}
          >
            <div className="text-xs font-medium uppercase">
              {format(day, "EEE")}
            </div>
            <div className="text-lg font-semibold">{format(day, "d")}</div>
          </div>
        ))}
      </div>

      {/* Shifts Grid */}
      {isLoading ? (
        <div className="p-4">
          <div className="animate-pulse h-40 bg-gray-200 rounded" />
        </div>
      ) : (
        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDays.map(day => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className="border-r last:border-r-0 p-2 hover:bg-gray-50 cursor-pointer min-h-[150px]"
                onClick={() => handleDayClick(day)}
              >
                {dayShifts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <Plus className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayShifts.map(shift => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        onDelete={() => deleteShift.mutate({ id: shift.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Templates Quick Apply */}
      {templates.length > 0 && !userId && (
        <div className="p-4 border-t bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Quick Apply Template
          </h4>
          <div className="flex flex-wrap gap-2">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  // Apply to all users for selected date or today
                  const targetDate = selectedDate || new Date();
                  if (users.length > 0) {
                    applyTemplate.mutate({
                      templateId: template.id,
                      userIds: users.map(u => u.id),
                      dates: [format(targetDate, "yyyy-MM-dd")],
                    });
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                style={{ borderLeftColor: template.color, borderLeftWidth: 3 }}
              >
                {template.name}
                <span className="text-gray-500 text-xs">
                  {template.startTime.substring(0, 5)} -{" "}
                  {template.endTime.substring(0, 5)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && selectedDate && (
        <CreateShiftModal
          date={selectedDate}
          users={users}
          templates={templates}
          defaultUserId={userId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onCreate={data => createShift.mutate(data)}
          isPending={createShift.isPending}
        />
      )}
    </div>
  );
}

interface ShiftCardProps {
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    shiftType: string;
    status: string;
    notes: string | null;
    user: { id: number; name: string | null; email: string | null } | null;
  };
  onDelete: () => void;
}

function ShiftCard({ shift, onDelete }: ShiftCardProps) {
  const statusClass =
    shiftStatusColors[shift.status as ShiftStatus] ||
    shiftStatusColors.scheduled;

  return (
    <div
      className={`p-2 rounded border text-xs ${statusClass}`}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {shift.user && (
            <div className="font-medium truncate">
              {shift.user.name || shift.user.email}
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="h-3 w-3" />
            {shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)}
          </div>
          {shift.breakStart && (
            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
              <Coffee className="h-3 w-3" />
              {shift.breakStart.substring(0, 5)} -{" "}
              {shift.breakEnd?.substring(0, 5)}
            </div>
          )}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-0.5 text-gray-400 hover:text-red-600 rounded"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface CreateShiftModalProps {
  date: Date;
  users: Array<{ id: number; name: string | null; email: string | null }>;
  templates: Array<{
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    color: string;
  }>;
  defaultUserId?: number;
  onClose: () => void;
  onCreate: (data: {
    userId: number;
    shiftDate: string;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    shiftType?: "regular" | "overtime" | "on_call" | "training";
    notes?: string;
  }) => void;
  isPending: boolean;
}

function CreateShiftModal({
  date,
  users,
  templates,
  defaultUserId,
  onClose,
  onCreate,
  isPending,
}: CreateShiftModalProps) {
  const [userId, setUserId] = useState(defaultUserId || (users[0]?.id ?? 0));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [shiftType, setShiftType] = useState<
    "regular" | "overtime" | "on_call" | "training"
  >("regular");
  const [notes, setNotes] = useState("");

  const handleApplyTemplate = (template: (typeof templates)[0]) => {
    setStartTime(template.startTime.substring(0, 5));
    setEndTime(template.endTime.substring(0, 5));
    if (template.breakStart) setBreakStart(template.breakStart.substring(0, 5));
    if (template.breakEnd) setBreakEnd(template.breakEnd.substring(0, 5));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      userId,
      shiftDate: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      breakStart: breakStart || undefined,
      breakEnd: breakEnd || undefined,
      shiftType,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Add Shift - {format(date, "EEEE, MMMM d")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apply Template
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleApplyTemplate(t)}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                    style={{ borderLeftColor: t.color, borderLeftWidth: 3 }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Selection */}
          {!defaultUserId && users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Employee
              </label>
              <select
                value={userId}
                onChange={e => setUserId(Number(e.target.value))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Break Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Coffee className="h-4 w-4 inline mr-1" />
                Break Start
              </label>
              <input
                type="time"
                value={breakStart}
                onChange={e => setBreakStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break End
              </label>
              <input
                type="time"
                value={breakEnd}
                onChange={e => setBreakEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Type
            </label>
            <select
              value={shiftType}
              onChange={e => setShiftType(e.target.value as typeof shiftType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="regular">Regular</option>
              <option value="overtime">Overtime</option>
              <option value="on_call">On Call</option>
              <option value="training">Training</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !userId}
              className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShiftScheduleView;
