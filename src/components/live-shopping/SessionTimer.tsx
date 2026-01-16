/**
 * Session Timer Component (MEET-075-FE)
 *
 * Displays session duration and remaining time until timeout.
 * Provides visual warnings when timeout is approaching.
 */
import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "../../utils/trpc";

interface SessionTimerProps {
  sessionId: number;
  startedAt: Date | string | null;
  expiresAt?: Date | string | null;
  onTimeoutWarning?: () => void;
  onExpired?: () => void;
  onExtend?: () => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  sessionId,
  startedAt,
  expiresAt,
  onTimeoutWarning,
  onExpired,
  onExtend,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const extendTimeoutMutation = trpc.liveShopping.extendTimeout.useMutation({
    onSuccess: () => {
      onExtend?.();
    },
  });

  // Calculate initial values
  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    setElapsedSeconds(Math.floor((now - startTime) / 1000));

    if (expiresAt) {
      const expireTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expireTime - now) / 1000));
      setRemainingSeconds(remaining);
      setIsWarning(remaining > 0 && remaining <= 300); // 5 minutes warning
      setIsExpired(remaining <= 0);
    }
  }, [startedAt, expiresAt]);

  // Update timers every second
  useEffect(() => {
    if (!startedAt) return;

    const interval = setInterval(() => {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));

      if (expiresAt) {
        const expireTime = new Date(expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expireTime - now) / 1000));
        setRemainingSeconds(remaining);

        // Warning at 5 minutes
        if (remaining > 0 && remaining <= 300 && !isWarning) {
          setIsWarning(true);
          onTimeoutWarning?.();
        }

        // Expired
        if (remaining <= 0 && !isExpired) {
          setIsExpired(true);
          onExpired?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, expiresAt, isWarning, isExpired, onTimeoutWarning, onExpired]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleExtend = () => {
    extendTimeoutMutation.mutate({
      sessionId,
      additionalMinutes: 60, // Extend by 1 hour
    });
  };

  if (!startedAt) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {/* Session Duration */}
      <div className="text-center">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Duration</div>
        <div className="text-lg font-mono font-semibold text-gray-700">
          {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* Remaining Time (if timeout configured) */}
      {remainingSeconds !== null && remainingSeconds >= 0 && (
        <div
          className={`text-center px-3 py-1 rounded-lg ${
            isExpired
              ? "bg-red-100 border border-red-300"
              : isWarning
              ? "bg-amber-100 border border-amber-300 animate-pulse"
              : "bg-gray-100 border border-gray-200"
          }`}
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {isExpired ? "Expired" : "Remaining"}
          </div>
          <div
            className={`text-lg font-mono font-semibold ${
              isExpired
                ? "text-red-600"
                : isWarning
                ? "text-amber-600"
                : "text-gray-700"
            }`}
          >
            {isExpired ? "00:00" : formatTime(remainingSeconds)}
          </div>
        </div>
      )}

      {/* Extend Button (when warning or expired) */}
      {(isWarning || isExpired) && (
        <button
          onClick={handleExtend}
          disabled={extendTimeoutMutation.isPending}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isExpired
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-amber-500 hover:bg-amber-600 text-white"
          } disabled:opacity-50`}
        >
          {extendTimeoutMutation.isPending ? "Extending..." : "+1 Hour"}
        </button>
      )}
    </div>
  );
};

export default SessionTimer;
