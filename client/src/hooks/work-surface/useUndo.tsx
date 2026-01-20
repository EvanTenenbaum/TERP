/**
 * useUndo Hook (UXS-707)
 *
 * Undo infrastructure for destructive actions.
 * Provides a consistent undo pattern with toast notification
 * and countdown timer.
 *
 * Features:
 * - 10 second undo window
 * - Toast with countdown
 * - Queue for multiple undo actions
 * - Keyboard shortcut support (Cmd+Z)
 *
 * @see ATOMIC_UX_STRATEGY.md for undo requirements
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface UndoAction<T = unknown> {
  /** Unique identifier for this action */
  id: string;
  /** Description shown in toast */
  description: string;
  /** Function to call when undoing */
  undo: () => void | Promise<void>;
  /** Optional: Function to call when action is confirmed (timeout expires) */
  onConfirm?: () => void | Promise<void>;
  /** Data associated with this action */
  data?: T;
  /** Timestamp when action was created */
  createdAt: number;
  /** Custom duration in ms (default: 10000) */
  duration?: number;
}

export interface UndoState {
  /** Currently active undo actions */
  actions: UndoAction[];
  /** Whether any actions can be undone */
  canUndo: boolean;
  /** Most recent action */
  lastAction: UndoAction | null;
}

export interface UseUndoOptions {
  /** Default undo window in ms (default: 10000) */
  defaultDuration?: number;
  /** Maximum actions in queue (default: 5) */
  maxQueueSize?: number;
  /** Enable Cmd+Z keyboard shortcut (default: true) */
  enableKeyboard?: boolean;
  /** Custom toast options */
  toastOptions?: {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  };
}

export interface UseUndoReturn {
  /** Current undo state */
  state: UndoState;
  /** Register an undoable action */
  registerAction: <T = unknown>(action: Omit<UndoAction<T>, 'id' | 'createdAt'>) => string;
  /** Undo a specific action by ID */
  undoAction: (id: string) => Promise<void>;
  /** Undo the most recent action */
  undoLast: () => Promise<void>;
  /** Cancel an action (remove from queue without executing) */
  cancelAction: (id: string) => void;
  /** Clear all pending actions */
  clearAll: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 10000; // 10 seconds
const MAX_QUEUE_SIZE = 5;

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for managing undoable actions
 *
 * @example
 * ```tsx
 * const { registerAction, undoLast } = useUndo();
 *
 * const handleDelete = async (item) => {
 *   // Optimistically remove item
 *   removeItem(item.id);
 *
 *   // Register undo action
 *   registerAction({
 *     description: `Deleted "${item.name}"`,
 *     undo: async () => {
 *       await restoreItem(item);
 *     },
 *     onConfirm: async () => {
 *       await permanentlyDeleteItem(item.id);
 *     },
 *   });
 * };
 * ```
 */
export function useUndo(options: UseUndoOptions = {}): UseUndoReturn {
  const {
    defaultDuration = DEFAULT_DURATION,
    maxQueueSize = MAX_QUEUE_SIZE,
    enableKeyboard = true,
    toastOptions = {},
  } = options;

  const [actions, setActions] = useState<UndoAction[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const toastIdsRef = useRef<Map<string, string | number>>(new Map());

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  // Keyboard shortcut (Cmd+Z)
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (actions.length > 0) {
          const lastAction = actions[actions.length - 1];
          undoAction(lastAction.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, actions]);

  // Remove action from queue
  const removeAction = useCallback((id: string, executeConfirm = false) => {
    setActions((prev) => {
      const action = prev.find((a) => a.id === id);
      if (action && executeConfirm && action.onConfirm) {
        // Execute confirm callback asynchronously
        Promise.resolve(action.onConfirm()).catch(console.error);
      }
      return prev.filter((a) => a.id !== id);
    });

    // Clear timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Dismiss toast
    const toastId = toastIdsRef.current.get(id);
    if (toastId) {
      toast.dismiss(toastId);
      toastIdsRef.current.delete(id);
    }
  }, []);

  // Register an undoable action
  const registerAction = useCallback(<T = unknown>(
    actionConfig: Omit<UndoAction<T>, 'id' | 'createdAt'>
  ): string => {
    const id = generateId();
    const duration = actionConfig.duration ?? defaultDuration;

    const action: UndoAction<T> = {
      ...actionConfig,
      id,
      createdAt: Date.now(),
      duration,
    };

    // Add to queue (with max size enforcement)
    setActions((prev) => {
      const newActions = [...prev, action as UndoAction];
      // Remove oldest actions if over limit
      while (newActions.length > maxQueueSize) {
        const oldest = newActions.shift();
        if (oldest) {
          removeAction(oldest.id, true);
        }
      }
      return newActions;
    });

    // Set timer for auto-confirm
    const timer = setTimeout(() => {
      removeAction(id, true);
    }, duration);
    timersRef.current.set(id, timer);

    // Show toast with countdown
    const toastId = toast(action.description, {
      duration: duration,
      action: {
        label: 'Undo',
        onClick: () => undoAction(id),
      },
      onDismiss: () => {
        // Only confirm if not already undone
        if (timersRef.current.has(id)) {
          removeAction(id, true);
        }
      },
      ...toastOptions,
    });
    toastIdsRef.current.set(id, toastId);

    return id;
  }, [defaultDuration, maxQueueSize, removeAction, toastOptions]);

  // Undo a specific action
  const undoAction = useCallback(async (id: string): Promise<void> => {
    const action = actions.find((a) => a.id === id);
    if (!action) return;

    try {
      // Execute undo
      await Promise.resolve(action.undo());

      // Remove from queue (don't execute confirm)
      removeAction(id, false);

      toast.success('Action undone');
    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Failed to undo action');
    }
  }, [actions, removeAction]);

  // Undo the most recent action
  const undoLast = useCallback(async (): Promise<void> => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    await undoAction(lastAction.id);
  }, [actions, undoAction]);

  // Cancel an action (remove without executing)
  const cancelAction = useCallback((id: string): void => {
    removeAction(id, false);
  }, [removeAction]);

  // Clear all pending actions
  const clearAll = useCallback((): void => {
    actions.forEach((action) => {
      removeAction(action.id, true);
    });
  }, [actions, removeAction]);

  // Build state
  const state: UndoState = {
    actions,
    canUndo: actions.length > 0,
    lastAction: actions.length > 0 ? actions[actions.length - 1] : null,
  };

  return {
    state,
    registerAction,
    undoAction,
    undoLast,
    cancelAction,
    clearAll,
  };
}

// ============================================================================
// Undo Context (For App-Wide Undo)
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';

const UndoContext = createContext<UseUndoReturn | null>(null);

export interface UndoProviderProps {
  children: ReactNode;
  options?: UseUndoOptions;
}

/**
 * Provider for app-wide undo functionality
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <UndoProvider>
 *   <App />
 * </UndoProvider>
 *
 * // In any component
 * const { registerAction } = useUndoContext();
 * ```
 */
export function UndoProvider({ children, options }: UndoProviderProps) {
  const undo = useUndo(options);

  return (
    <UndoContext.Provider value={undo}>
      {children}
    </UndoContext.Provider>
  );
}

/**
 * Hook to access app-wide undo context
 */
export function useUndoContext(): UseUndoReturn {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndoContext must be used within an UndoProvider');
  }
  return context;
}

// ============================================================================
// Undo Toast Component (Custom Toast with Countdown)
// ============================================================================

export interface UndoToastProps {
  action: UndoAction;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Custom toast component with countdown timer
 * Can be used for custom styling
 */
export function UndoToast({ action, onUndo, onDismiss }: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(
    Math.ceil((action.duration ?? DEFAULT_DURATION) / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      onDismiss();
    }
  }, [timeLeft, onDismiss]);

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-background border rounded-lg shadow-lg">
      <div className="flex-1">
        <p className="text-sm font-medium">{action.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Undo in {timeLeft}s
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          className="px-3 py-1 text-sm font-medium text-primary hover:underline"
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      {/* Countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-b-lg">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-linear"
          style={{
            width: `${(timeLeft / ((action.duration ?? DEFAULT_DURATION) / 1000)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export default useUndo;
