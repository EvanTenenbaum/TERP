/**
 * useSessionTimeout - Session timeout handler for Work Surfaces
 * UXS-706: Implements session timeout detection and warning UI
 *
 * Features:
 * - Detects user inactivity and approaching session expiry
 * - Shows warning dialog before session expires
 * - Allows user to extend session
 * - Handles graceful logout on timeout
 * - Preserves unsaved work state for recovery
 *
 * Usage:
 * ```tsx
 * const {
 *   SessionTimeoutDialog,
 *   isSessionExpiring,
 *   extendSession,
 *   timeRemaining,
 * } = useSessionTimeout({
 *   warningThresholdMs: 5 * 60 * 1000, // 5 minutes before expiry
 *   onSessionExpired: () => router.push('/login'),
 *   onSessionExtended: () => refreshToken(),
 * });
 *
 * return (
 *   <>
 *     <YourApp />
 *     <SessionTimeoutDialog />
 *   </>
 * );
 * ```
 *
 * @see ATOMIC_UX_STRATEGY.md Section 6.2 - Session Management
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface SessionTimeoutOptions {
  /**
   * Session duration in milliseconds
   * @default 30 * 60 * 1000 (30 minutes)
   */
  sessionDurationMs?: number;

  /**
   * Show warning dialog this many ms before session expires
   * @default 5 * 60 * 1000 (5 minutes)
   */
  warningThresholdMs?: number;

  /**
   * Interval to check session status (ms)
   * @default 10000 (10 seconds)
   */
  checkIntervalMs?: number;

  /**
   * Called when session expires - typically redirect to login
   */
  onSessionExpired?: () => void;

  /**
   * Called when user extends session - typically refresh auth token
   */
  onSessionExtended?: () => Promise<void> | void;

  /**
   * Called before session expires to save work state
   */
  onSaveWorkState?: () => Promise<void> | void;

  /**
   * User activity events that reset the idle timer
   * @default ["mousedown", "keydown", "touchstart", "scroll"]
   */
  activityEvents?: string[];

  /**
   * Idle timeout in ms - session expires after this much inactivity
   * Set to 0 to disable idle detection (only use token expiry)
   * @default 0 (disabled)
   */
  idleTimeoutMs?: number;

  /**
   * Enable session timeout handling
   * @default true
   */
  enabled?: boolean;

  /**
   * Custom storage key for session state
   * @default "terp_session_state"
   */
  storageKey?: string;
}

export interface SessionState {
  /** Session start timestamp */
  startedAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Session expiry timestamp */
  expiresAt: number;
  /** Whether session is currently being extended */
  isExtending: boolean;
}

export interface UseSessionTimeoutReturn {
  /** Pre-rendered dialog component - place at root of app */
  SessionTimeoutDialog: React.ReactNode;
  /** Whether the session expiry warning is showing */
  isSessionExpiring: boolean;
  /** Time remaining in milliseconds */
  timeRemaining: number;
  /** Formatted time remaining (e.g., "4:32") */
  timeRemainingFormatted: string;
  /** Extend the session */
  extendSession: () => Promise<void>;
  /** End the session now */
  endSession: () => void;
  /** Current session state */
  sessionState: SessionState | null;
  /** Manually record user activity */
  recordActivity: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CHECK_INTERVAL_MS = 10000; // 10 seconds
const DEFAULT_ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getStoredSessionState(key: string): SessionState | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function storeSessionState(key: string, state: SessionState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function clearSessionState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// DIALOG COMPONENT
// ============================================================================

interface TimeoutDialogProps {
  open: boolean;
  timeRemaining: string;
  onExtend: () => void;
  onLogout: () => void;
  isExtending: boolean;
}

function SessionTimeoutDialogComponent({
  open,
  timeRemaining,
  onExtend,
  onLogout,
  isExtending,
}: TimeoutDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity. Any unsaved changes may
            be lost.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <div
            className={cn(
              "flex items-center justify-center w-24 h-24 rounded-full mb-4",
              "bg-yellow-100 text-yellow-700"
            )}
          >
            <Clock className="h-12 w-12" />
          </div>
          <div className="text-3xl font-bold text-center tabular-nums">
            {timeRemaining}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Time remaining</p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={isExtending}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out Now
          </Button>
          <Button
            onClick={onExtend}
            disabled={isExtending}
            className="w-full sm:w-auto"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Continue Working
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSessionTimeout({
  sessionDurationMs = DEFAULT_SESSION_DURATION_MS,
  warningThresholdMs = DEFAULT_WARNING_THRESHOLD_MS,
  checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
  onSessionExpired,
  onSessionExtended,
  onSaveWorkState,
  activityEvents = DEFAULT_ACTIVITY_EVENTS,
  idleTimeoutMs = 0,
  enabled = true,
  storageKey = "terp_session_state",
}: SessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  // Session state
  const [sessionState, setSessionState] = useState<SessionState | null>(() => {
    if (!enabled) return null;

    // Check for existing session
    const stored = getStoredSessionState(storageKey);
    if (stored && stored.expiresAt > Date.now()) {
      return stored;
    }

    // Create new session
    const now = Date.now();
    return {
      startedAt: now,
      lastActivityAt: now,
      expiresAt: now + sessionDurationMs,
      isExtending: false,
    };
  });

  // Dialog state
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionDurationMs);
  const [isExtending, setIsExtending] = useState(false);

  // Refs for event handlers
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================================
  // Record user activity
  // ============================================================================
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (sessionState && !showWarning) {
      const updated = {
        ...sessionState,
        lastActivityAt: Date.now(),
      };
      setSessionState(updated);
      storeSessionState(storageKey, updated);
    }
  }, [sessionState, showWarning, storageKey]);

  // ============================================================================
  // Extend session
  // ============================================================================
  const extendSession = useCallback(async () => {
    if (!sessionState) return;

    setIsExtending(true);

    try {
      // Call extension callback (e.g., refresh token)
      await onSessionExtended?.();

      // Update session state
      const now = Date.now();
      const updated: SessionState = {
        startedAt: sessionState.startedAt,
        lastActivityAt: now,
        expiresAt: now + sessionDurationMs,
        isExtending: false,
      };

      setSessionState(updated);
      storeSessionState(storageKey, updated);
      setShowWarning(false);
      setTimeRemaining(sessionDurationMs);
      lastActivityRef.current = now;
    } catch (error) {
      console.error("[SessionTimeout] Failed to extend session:", error);
    } finally {
      setIsExtending(false);
    }
  }, [sessionState, sessionDurationMs, onSessionExtended, storageKey]);

  // ============================================================================
  // End session
  // ============================================================================
  const endSession = useCallback(async () => {
    // Save work state before ending
    try {
      await onSaveWorkState?.();
    } catch (error) {
      console.error("[SessionTimeout] Failed to save work state:", error);
    }

    // Clear session
    clearSessionState(storageKey);
    setSessionState(null);
    setShowWarning(false);

    // Trigger logout callback
    onSessionExpired?.();
  }, [onSaveWorkState, onSessionExpired, storageKey]);

  // ============================================================================
  // Check session status
  // ============================================================================
  useEffect(() => {
    if (!enabled || !sessionState) return;

    const checkSession = () => {
      const now = Date.now();
      const remaining = sessionState.expiresAt - now;

      // Check idle timeout
      if (idleTimeoutMs > 0) {
        const idleTime = now - lastActivityRef.current;
        if (idleTime > idleTimeoutMs) {
          // Session expired due to inactivity
          endSession();
          return;
        }
      }

      // Update time remaining
      setTimeRemaining(Math.max(0, remaining));

      // Check if session expired
      if (remaining <= 0) {
        endSession();
        return;
      }

      // Check if warning should show
      if (remaining <= warningThresholdMs && !showWarning) {
        setShowWarning(true);
      }
    };

    // Initial check
    checkSession();

    // Start interval
    checkIntervalRef.current = setInterval(checkSession, checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [
    enabled,
    sessionState,
    warningThresholdMs,
    checkIntervalMs,
    idleTimeoutMs,
    showWarning,
    endSession,
  ]);

  // ============================================================================
  // Activity event listeners
  // ============================================================================
  useEffect(() => {
    if (!enabled || idleTimeoutMs === 0) return;

    const handleActivity = () => {
      recordActivity();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, idleTimeoutMs, activityEvents, recordActivity]);

  // ============================================================================
  // Persist session state
  // ============================================================================
  useEffect(() => {
    if (sessionState) {
      storeSessionState(storageKey, sessionState);
    }
  }, [sessionState, storageKey]);

  // ============================================================================
  // Dialog component
  // ============================================================================
  const SessionTimeoutDialog = useMemo(
    () => (
      <SessionTimeoutDialogComponent
        open={showWarning}
        timeRemaining={formatTimeRemaining(timeRemaining)}
        onExtend={extendSession}
        onLogout={endSession}
        isExtending={isExtending}
      />
    ),
    [showWarning, timeRemaining, extendSession, endSession, isExtending]
  );

  return {
    SessionTimeoutDialog,
    isSessionExpiring: showWarning,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    extendSession,
    endSession,
    sessionState,
    recordActivity,
  };
}

export default useSessionTimeout;
