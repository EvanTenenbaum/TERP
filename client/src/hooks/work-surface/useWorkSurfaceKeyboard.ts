/**
 * useWorkSurfaceKeyboard - Work Surface keyboard contract implementation
 * UXS-101: Implements the universal keyboard contract for Work Surfaces
 *
 * Keyboard Contract (from ATOMIC_UX_STRATEGY.md):
 * - Tab: Move to next field/cell
 * - Shift+Tab: Move to previous field/cell
 * - Enter: Commit edit; if row valid, create next row
 * - Esc: Cancel edit or close inspector
 * - Cmd/Ctrl+Z: Undo last destructive action
 *
 * Usage:
 * ```tsx
 * const { keyboardProps, focusState } = useWorkSurfaceKeyboard({
 *   onRowCommit: (row) => mutation.mutate(row),
 *   onRowCreate: () => addNewRow(),
 *   onCancel: () => setEditing(false),
 *   onUndo: () => undoManager.undo(),
 *   isInspectorOpen: inspectorOpen,
 *   onInspectorClose: () => setInspectorOpen(false),
 * });
 *
 * return <div {...keyboardProps}>...</div>;
 * ```
 *
 * @see useKeyboardShortcuts.ts - Existing global shortcuts (extend, don't replace)
 * @see useOptimisticLocking.tsx - Reference pattern for hook structure
 */

import { useCallback, useState, useRef, useEffect, KeyboardEvent } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface WorkSurfaceKeyboardOptions {
  /** Called when Enter is pressed and current row is valid */
  onRowCommit?: (rowData?: unknown) => void | Promise<void>;
  /** Called after successful commit to create next row */
  onRowCreate?: () => void;
  /** Called when Esc is pressed to cancel current edit */
  onCancel?: () => void;
  /** Called when Cmd/Ctrl+Z is pressed */
  onUndo?: () => void;
  /** Whether inspector panel is currently open */
  isInspectorOpen?: boolean;
  /** Called when Esc pressed while inspector is open */
  onInspectorClose?: () => void;
  /** Validation function - if returns false, Enter won't commit */
  validateRow?: () => boolean;
  /** Custom key handlers for module-specific shortcuts */
  customHandlers?: Record<string, (e: KeyboardEvent) => void>;
  /** Disable keyboard handling (e.g., when in non-Work Surface mode) */
  disabled?: boolean;
}

export interface FocusState {
  /** Currently focused cell coordinates */
  row: number | null;
  col: number | null;
  /** Whether cell is in edit mode */
  isEditing: boolean;
}

export interface UseWorkSurfaceKeyboardReturn {
  /** Props to spread on the Work Surface container */
  keyboardProps: {
    onKeyDown: (e: KeyboardEvent) => void;
    tabIndex: number;
  };
  /** Current focus state */
  focusState: FocusState;
  /** Programmatically set focus */
  setFocus: (row: number, col: number) => void;
  /** Enter edit mode on current cell */
  startEditing: () => void;
  /** Exit edit mode */
  stopEditing: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWorkSurfaceKeyboard({
  onRowCommit,
  onRowCreate,
  onCancel,
  onUndo,
  isInspectorOpen = false,
  onInspectorClose,
  validateRow,
  customHandlers = {},
  disabled = false,
}: WorkSurfaceKeyboardOptions): UseWorkSurfaceKeyboardReturn {
  // Focus tracking
  const [focusState, setFocusState] = useState<FocusState>({
    row: null,
    col: null,
    isEditing: false,
  });

  // Ref for tracking if we're in a text input (to not intercept normal typing)
  const isInTextInput = useRef(false);

  // ============================================================================
  // TODO: Implement Tab/Shift+Tab navigation
  // - Track focusable cells in grid
  // - Move focus linearly through cells
  // - Wrap at row boundaries
  // - Consider AG Grid's built-in navigation
  // ============================================================================
  const handleTab = useCallback((e: KeyboardEvent, reverse: boolean) => {
    // TODO: Implement cell-to-cell navigation
    // For now, let browser handle tab
    // e.preventDefault();
    // const nextCell = reverse ? getPreviousCell() : getNextCell();
    // setFocus(nextCell.row, nextCell.col);
  }, []);

  // ============================================================================
  // TODO: Implement Enter commit + new row creation
  // - Validate current row
  // - Commit if valid
  // - Create new row if at end
  // - Focus first editable cell of new row
  // ============================================================================
  const handleEnter = useCallback(
    async (e: KeyboardEvent) => {
      if (focusState.isEditing) {
        e.preventDefault();

        // Validate before commit
        const isValid = validateRow ? validateRow() : true;
        if (!isValid) {
          // TODO: Show validation errors via blur timing
          return;
        }

        // Commit the row
        if (onRowCommit) {
          await onRowCommit();
        }

        // Create new row
        if (onRowCreate) {
          onRowCreate();
        }
      }
    },
    [focusState.isEditing, validateRow, onRowCommit, onRowCreate]
  );

  // ============================================================================
  // Escape handling - Cancel or close inspector
  // ============================================================================
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();

      // Priority 1: Close inspector if open
      if (isInspectorOpen && onInspectorClose) {
        onInspectorClose();
        return;
      }

      // Priority 2: Cancel current edit
      if (focusState.isEditing) {
        setFocusState((prev) => ({ ...prev, isEditing: false }));
        onCancel?.();
        return;
      }

      // Priority 3: General cancel
      onCancel?.();
    },
    [isInspectorOpen, onInspectorClose, focusState.isEditing, onCancel]
  );

  // ============================================================================
  // Undo handling - Cmd/Ctrl+Z
  // ============================================================================
  const handleUndo = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      }
    },
    [onUndo]
  );

  // ============================================================================
  // Main keyboard handler
  // ============================================================================
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Check for custom handlers first
      const customKey = `${e.ctrlKey ? "ctrl+" : ""}${e.metaKey ? "cmd+" : ""}${e.shiftKey ? "shift+" : ""}${e.key.toLowerCase()}`;
      if (customHandlers[customKey]) {
        customHandlers[customKey](e);
        return;
      }

      // Standard Work Surface keyboard contract
      switch (e.key) {
        case "Tab":
          handleTab(e, e.shiftKey);
          break;
        case "Enter":
          handleEnter(e);
          break;
        case "Escape":
          handleEscape(e);
          break;
        case "z":
          handleUndo(e);
          break;
      }
    },
    [disabled, customHandlers, handleTab, handleEnter, handleEscape, handleUndo]
  );

  // ============================================================================
  // Focus management utilities
  // ============================================================================
  const setFocus = useCallback((row: number, col: number) => {
    setFocusState((prev) => ({ ...prev, row, col }));
  }, []);

  const startEditing = useCallback(() => {
    setFocusState((prev) => ({ ...prev, isEditing: true }));
  }, []);

  const stopEditing = useCallback(() => {
    setFocusState((prev) => ({ ...prev, isEditing: false }));
  }, []);

  return {
    keyboardProps: {
      onKeyDown: handleKeyDown,
      tabIndex: 0, // Make container focusable
    },
    focusState,
    setFocus,
    startEditing,
    stopEditing,
  };
}

export default useWorkSurfaceKeyboard;
