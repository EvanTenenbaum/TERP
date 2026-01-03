import { useState, useEffect } from "react";
import { Repeat, Calendar, Hash } from "lucide-react";

interface RecurrencePattern {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
  endType: "never" | "date" | "count";
  endDate?: string;
  endCount?: number;
}

interface RecurrencePatternBuilderProps {
  value: RecurrencePattern;
  onChange: (pattern: RecurrencePattern) => void;
  startDate?: string; // ISO date string
}

const DAYS_OF_WEEK = [
  { value: 0, label: "S", fullLabel: "Sunday" },
  { value: 1, label: "M", fullLabel: "Monday" },
  { value: 2, label: "T", fullLabel: "Tuesday" },
  { value: 3, label: "W", fullLabel: "Wednesday" },
  { value: 4, label: "T", fullLabel: "Thursday" },
  { value: 5, label: "F", fullLabel: "Friday" },
  { value: 6, label: "S", fullLabel: "Saturday" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function RecurrencePatternBuilder({
  value,
  onChange,
  startDate,
}: RecurrencePatternBuilderProps) {
  const [localPattern, setLocalPattern] = useState<RecurrencePattern>(value);

  useEffect(() => {
    setLocalPattern(value);
  }, [value]);

  const updatePattern = (updates: Partial<RecurrencePattern>) => {
    const newPattern = { ...localPattern, ...updates };
    setLocalPattern(newPattern);
    onChange(newPattern);
  };

  const toggleDayOfWeek = (day: number) => {
    const currentDays = localPattern.daysOfWeek || [];
    let newDays: number[];

    if (currentDays.includes(day)) {
      newDays = currentDays.filter((d) => d !== day);
    } else {
      newDays = [...currentDays, day].sort((a, b) => a - b);
    }

    updatePattern({ daysOfWeek: newDays.length > 0 ? newDays : undefined });
  };

  const getFrequencyLabel = () => {
    switch (localPattern.frequency) {
      case "DAILY":
        return localPattern.interval === 1 ? "day" : "days";
      case "WEEKLY":
        return localPattern.interval === 1 ? "week" : "weeks";
      case "MONTHLY":
        return localPattern.interval === 1 ? "month" : "months";
      case "YEARLY":
        return localPattern.interval === 1 ? "year" : "years";
    }
  };

  const getSummary = () => {
    let summary = "Repeats ";

    if (localPattern.interval === 1) {
      summary += localPattern.frequency.toLowerCase().replace("ly", "");
    } else {
      summary += `every ${localPattern.interval} ${getFrequencyLabel()}`;
    }

    if (localPattern.frequency === "WEEKLY" && localPattern.daysOfWeek?.length) {
      const dayNames = localPattern.daysOfWeek.map(
        (d) => DAYS_OF_WEEK.find((day) => day.value === d)?.fullLabel
      );
      summary += ` on ${dayNames.join(", ")}`;
    }

    if (localPattern.endType === "date" && localPattern.endDate) {
      summary += ` until ${new Date(localPattern.endDate).toLocaleDateString()}`;
    } else if (localPattern.endType === "count" && localPattern.endCount) {
      summary += `, ${localPattern.endCount} times`;
    }

    return summary;
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Repeat className="h-4 w-4" />
        Recurrence Pattern
      </div>

      {/* Frequency Selection */}
      <div className="grid grid-cols-4 gap-2">
        {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const).map((freq) => (
          <button
            key={freq}
            type="button"
            onClick={() => updatePattern({ frequency: freq })}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              localPattern.frequency === freq
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {freq.charAt(0) + freq.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Interval */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Repeat every</span>
        <input
          type="number"
          min="1"
          max="99"
          value={localPattern.interval}
          onChange={(e) =>
            updatePattern({ interval: Math.max(1, parseInt(e.target.value) || 1) })
          }
          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">{getFrequencyLabel()}</span>
      </div>

      {/* Weekly: Days of Week */}
      {localPattern.frequency === "WEEKLY" && (
        <div className="space-y-2">
          <span className="text-sm text-gray-600">Repeat on</span>
          <div className="flex gap-1">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDayOfWeek(day.value)}
                title={day.fullLabel}
                className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                  localPattern.daysOfWeek?.includes(day.value)
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly: Day of Month */}
      {localPattern.frequency === "MONTHLY" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">On day</span>
          <input
            type="number"
            min="1"
            max="31"
            value={localPattern.dayOfMonth || new Date(startDate || Date.now()).getDate()}
            onChange={(e) =>
              updatePattern({
                dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
              })
            }
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">of each month</span>
        </div>
      )}

      {/* Yearly: Month and Day */}
      {localPattern.frequency === "YEARLY" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Every</span>
          <select
            value={localPattern.monthOfYear || new Date(startDate || Date.now()).getMonth() + 1}
            onChange={(e) =>
              updatePattern({ monthOfYear: parseInt(e.target.value) })
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="31"
            value={localPattern.dayOfMonth || new Date(startDate || Date.now()).getDate()}
            onChange={(e) =>
              updatePattern({
                dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
              })
            }
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* End Condition */}
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <span className="text-sm font-medium text-gray-700">Ends</span>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={localPattern.endType === "never"}
              onChange={() => updatePattern({ endType: "never", endDate: undefined, endCount: undefined })}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Never</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={localPattern.endType === "date"}
              onChange={() => updatePattern({ endType: "date", endCount: undefined })}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">On date</span>
            {localPattern.endType === "date" && (
              <input
                type="date"
                value={localPattern.endDate || ""}
                onChange={(e) => updatePattern({ endDate: e.target.value })}
                min={startDate || new Date().toISOString().split("T")[0]}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={localPattern.endType === "count"}
              onChange={() => updatePattern({ endType: "count", endDate: undefined })}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">After</span>
            {localPattern.endType === "count" && (
              <>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={localPattern.endCount || 10}
                  onChange={(e) =>
                    updatePattern({
                      endCount: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">occurrences</span>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        {getSummary()}
      </div>
    </div>
  );
}

// Default pattern for new recurring events
export const getDefaultRecurrencePattern = (startDate?: string): RecurrencePattern => {
  const date = startDate ? new Date(startDate) : new Date();
  return {
    frequency: "WEEKLY",
    interval: 1,
    daysOfWeek: [date.getDay()],
    endType: "never",
  };
};
