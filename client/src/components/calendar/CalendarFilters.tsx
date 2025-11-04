import { useState } from "react";
import { Filter, X } from "lucide-react";

export default function CalendarFilters() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  const modules = [
    "INVENTORY",
    "ACCOUNTING",
    "CLIENTS",
    "VENDORS",
    "ORDERS",
    "SAMPLES",
    "COMPLIANCE",
    "GENERAL",
  ];

  const eventTypes = [
    "MEETING",
    "DEADLINE",
    "TASK",
    "DELIVERY",
    "PAYMENT_DUE",
    "FOLLOW_UP",
    "AUDIT",
    "INTAKE",
    "PHOTOGRAPHY",
    "BATCH_EXPIRATION",
    "RECURRING_ORDER",
    "SAMPLE_REQUEST",
    "OTHER",
  ];

  const statuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const toggleFilter = (value: string, list: string[], setter: (list: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
    } else {
      setter([...list, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedModules([]);
    setSelectedEventTypes([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
  };

  const activeFilterCount =
    selectedModules.length +
    selectedEventTypes.length +
    selectedStatuses.length +
    selectedPriorities.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearAllFilters();
            }}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </button>

      {/* Filter Options */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-6">
            {/* Modules */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Modules
              </div>
              <div className="space-y-1">
                {modules.map((module) => (
                  <label
                    key={module}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module)}
                      onChange={() =>
                        toggleFilter(module, selectedModules, setSelectedModules)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {module}
                  </label>
                ))}
              </div>
            </div>

            {/* Event Types */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Event Types
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {eventTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventTypes.includes(type)}
                      onChange={() =>
                        toggleFilter(type, selectedEventTypes, setSelectedEventTypes)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {type.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Status
              </div>
              <div className="space-y-1">
                {statuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() =>
                        toggleFilter(status, selectedStatuses, setSelectedStatuses)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {status.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Priority
              </div>
              <div className="space-y-1">
                {priorities.map((priority) => (
                  <label
                    key={priority}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(priority)}
                      onChange={() =>
                        toggleFilter(priority, selectedPriorities, setSelectedPriorities)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {priority}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
