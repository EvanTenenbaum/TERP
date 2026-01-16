/**
 * Credit Limit Display Component (MEET-075-FE)
 *
 * Shows running total vs client credit limit with visual progress bar.
 * Provides warnings when approaching or exceeding credit limit.
 */
import React from "react";
import { trpc } from "../../utils/trpc";

interface CreditLimitDisplayProps {
  sessionId: number;
  compact?: boolean;
}

export const CreditLimitDisplay: React.FC<CreditLimitDisplayProps> = ({
  sessionId,
  compact = false,
}) => {
  const { data: creditStatus, isLoading } = trpc.liveShopping.getDetailedCreditStatus.useQuery(
    { sessionId },
    {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-3 h-16">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!creditStatus) {
    return null;
  }

  const {
    creditLimit,
    currentExposure,
    cartTotal,
    projectedExposure,
    remainingCredit,
    warningLevel,
    breakdown,
    percentUtilized,
  } = creditStatus;

  // Calculate progress bar percentage (cap at 100% for display)
  const progressPercent = creditLimit > 0 ? Math.min((projectedExposure / creditLimit) * 100, 100) : 0;
  const isUnlimited = creditLimit === 0;

  // Determine color based on warning level
  const getColorClass = () => {
    if (warningLevel === "EXCEEDED") return "bg-red-500";
    if (warningLevel === "APPROACHING") return "bg-amber-500";
    return "bg-green-500";
  };

  const getBorderClass = () => {
    if (warningLevel === "EXCEEDED") return "border-red-200 bg-red-50";
    if (warningLevel === "APPROACHING") return "border-amber-200 bg-amber-50";
    return "border-gray-200 bg-white";
  };

  if (compact) {
    return (
      <div className={`rounded-lg border px-3 py-2 ${getBorderClass()}`}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Credit:</span>
          {isUnlimited ? (
            <span className="font-medium text-green-600">Unlimited</span>
          ) : (
            <span className={`font-medium ${
              warningLevel === "EXCEEDED" ? "text-red-600" :
              warningLevel === "APPROACHING" ? "text-amber-600" : "text-gray-900"
            }`}>
              ${remainingCredit.toFixed(0)} left
            </span>
          )}
        </div>
        {!isUnlimited && (
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getColorClass()}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${getBorderClass()}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Credit Status</h4>
          <p className="text-xs text-gray-500">
            {isUnlimited ? "No credit limit" : `${percentUtilized}% utilized`}
          </p>
        </div>
        {warningLevel !== "NONE" && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              warningLevel === "EXCEEDED"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {warningLevel === "EXCEEDED" ? "Over Limit" : "Approaching Limit"}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="mb-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getColorClass()}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Values */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500 text-xs">Credit Limit</div>
          <div className="font-semibold text-gray-900">
            {isUnlimited ? "Unlimited" : `$${creditLimit.toLocaleString()}`}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Current Exposure</div>
          <div className="font-semibold text-gray-900">${currentExposure.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Cart Total</div>
          <div className="font-semibold text-gray-900">${cartTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Remaining</div>
          <div
            className={`font-semibold ${
              warningLevel === "EXCEEDED"
                ? "text-red-600"
                : warningLevel === "APPROACHING"
                ? "text-amber-600"
                : "text-green-600"
            }`}
          >
            {isUnlimited ? "N/A" : `$${remainingCredit.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Cart Breakdown</div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>To Buy: ${breakdown.toPurchaseValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Interested: ${breakdown.interestedValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Samples: ${breakdown.sampleValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditLimitDisplay;
