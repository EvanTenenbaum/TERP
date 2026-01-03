import { X, Calendar, Repeat, AlertTriangle } from "lucide-react";

export type RecurrenceEditScope = "single" | "future" | "all";

interface RecurrenceEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (scope: RecurrenceEditScope) => void;
  action: "edit" | "delete";
  eventTitle: string;
  instanceDate?: string;
}

export default function RecurrenceEditDialog({
  isOpen,
  onClose,
  onSelect,
  action,
  eventTitle,
  instanceDate,
}: RecurrenceEditDialogProps) {
  if (!isOpen) return null;

  const isDelete = action === "delete";
  const actionVerb = isDelete ? "Delete" : "Edit";
  const actionVerbLower = isDelete ? "delete" : "edit";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            {isDelete ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Repeat className="h-5 w-5 text-blue-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {actionVerb} Recurring Event
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-600">
            "<span className="font-medium text-gray-900">{eventTitle}</span>" is a
            recurring event. How would you like to {actionVerbLower} it?
          </p>

          {instanceDate && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Selected date: {formatDate(instanceDate)}
            </div>
          )}

          <div className="space-y-2">
            {/* Single Instance */}
            <button
              onClick={() => onSelect("single")}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                isDelete ? "hover:border-red-300 hover:bg-red-50" : ""
              }`}
            >
              <div className="font-medium text-gray-900">
                {actionVerb} this event only
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Only this occurrence on {instanceDate ? formatDate(instanceDate) : "this date"} will be {isDelete ? "deleted" : "changed"}.
                Other occurrences will remain unchanged.
              </p>
            </button>

            {/* This and Future */}
            <button
              onClick={() => onSelect("future")}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                isDelete ? "hover:border-red-300 hover:bg-red-50" : ""
              }`}
            >
              <div className="font-medium text-gray-900">
                {actionVerb} this and future events
              </div>
              <p className="mt-1 text-sm text-gray-500">
                This and all future occurrences will be {isDelete ? "deleted" : "changed"}.
                Past occurrences will remain unchanged.
              </p>
            </button>

            {/* All Events */}
            <button
              onClick={() => onSelect("all")}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                isDelete ? "hover:border-red-300 hover:bg-red-50" : ""
              }`}
            >
              <div className="font-medium text-gray-900">
                {actionVerb} all events
              </div>
              <p className="mt-1 text-sm text-gray-500">
                All occurrences of this recurring event will be {isDelete ? "deleted" : "changed"}.
                {isDelete && (
                  <span className="mt-1 block text-red-600">
                    This action cannot be undone.
                  </span>
                )}
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
