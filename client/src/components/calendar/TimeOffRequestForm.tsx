import { useState } from "react";
import { X, Calendar, Clock, FileText } from "lucide-react";
import { trpc } from "../../lib/trpc";

interface TimeOffRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const TIME_OFF_TYPES = [
  { value: "vacation", label: "Vacation", color: "bg-blue-500" },
  { value: "sick", label: "Sick Leave", color: "bg-red-500" },
  { value: "personal", label: "Personal Time", color: "bg-purple-500" },
];

export default function TimeOffRequestForm({
  isOpen,
  onClose,
  onSubmitted,
}: TimeOffRequestFormProps) {
  const [timeOffType, setTimeOffType] = useState<"vacation" | "sick" | "personal">("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");

  const requestMutation = trpc.timeOffRequests.request.useMutation({
    onSuccess: () => {
      onSubmitted();
      resetForm();
      onClose();
    },
    onError: (error) => {
      alert(error.message || "Failed to submit request");
    },
  });

  const resetForm = () => {
    setTimeOffType("vacation");
    setStartDate("");
    setEndDate("");
    setIsFullDay(true);
    setStartTime("09:00");
    setEndTime("17:00");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert("Please select start and end dates");
      return;
    }

    await requestMutation.mutateAsync({
      timeOffType,
      startDate,
      endDate,
      isFullDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      notes: notes || undefined,
    });
  };

  // Set end date to start date when start date changes
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!endDate || value > endDate) {
      setEndDate(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Request Time Off
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Time Off Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type of Time Off *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TIME_OFF_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTimeOffType(type.value as any)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                      timeOffType === type.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${type.color}`} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Full Day Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Full day(s)
                </span>
              </label>
            </div>

            {/* Time Range (if not full day) */}
            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <Clock className="mr-1 inline h-4 w-4" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <Clock className="mr-1 inline h-4 w-4" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <FileText className="mr-1 inline h-4 w-4" />
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add any additional details..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestMutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {requestMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
