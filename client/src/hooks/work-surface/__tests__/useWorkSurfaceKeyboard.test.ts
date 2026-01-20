/**
 * Tests for useWorkSurfaceKeyboard Hook
 * UXS-101: Tests Work Surface keyboard contract implementation
 *
 * Keyboard Contract (from ATOMIC_UX_STRATEGY.md):
 * - Tab: Move to next field/cell
 * - Shift+Tab: Move to previous field/cell
 * - Enter: Commit edit; if row valid, create next row
 * - Esc: Cancel edit or close inspector
 * - Cmd/Ctrl+Z: Undo last destructive action
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkSurfaceKeyboard } from "../useWorkSurfaceKeyboard";
import React, { KeyboardEvent } from "react";

// Mock keyboard event factory
const createKeyboardEvent = (
  key: string,
  options: Partial<KeyboardEvent> = {}
): KeyboardEvent => ({
  key,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...options,
} as unknown as KeyboardEvent);

describe("useWorkSurfaceKeyboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should return keyboard props with onKeyDown and tabIndex", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      expect(result.current.keyboardProps).toBeDefined();
      expect(typeof result.current.keyboardProps.onKeyDown).toBe("function");
      expect(result.current.keyboardProps.tabIndex).toBe(0);
    });

    it("should return initial focus state as null/false", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      expect(result.current.focusState).toEqual({
        row: null,
        col: null,
        isEditing: false,
      });
    });

    it("should expose focus management functions", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      expect(typeof result.current.setFocus).toBe("function");
      expect(typeof result.current.startEditing).toBe("function");
      expect(typeof result.current.stopEditing).toBe("function");
      expect(typeof result.current.focusFirst).toBe("function");
      expect(typeof result.current.focusLast).toBe("function");
      expect(typeof result.current.resetFocus).toBe("function");
    });
  });

  describe("Enter key handling", () => {
    it("should call onRowCommit when Enter is pressed during editing", async () => {
      const onRowCommit = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onRowCommit })
      );

      // Start editing
      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Enter");

      await act(async () => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onRowCommit).toHaveBeenCalled();
    });

    it("should call onRowCreate after successful commit", async () => {
      const onRowCommit = vi.fn().mockResolvedValue(undefined);
      const onRowCreate = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onRowCommit, onRowCreate })
      );

      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Enter");

      await act(async () => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(onRowCommit).toHaveBeenCalled();
      expect(onRowCreate).toHaveBeenCalled();
    });

    it("should not commit if validation fails", async () => {
      const onRowCommit = vi.fn();
      const validateRow = vi.fn().mockReturnValue(false);
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onRowCommit, validateRow })
      );

      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Enter");

      await act(async () => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(validateRow).toHaveBeenCalled();
      expect(onRowCommit).not.toHaveBeenCalled();
    });

    it("should not call onRowCreate if commit throws error", async () => {
      const onRowCommit = vi.fn().mockRejectedValue(new Error("Commit failed"));
      const onRowCreate = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onRowCommit, onRowCreate })
      );

      act(() => {
        result.current.startEditing();
      });

      const event = createKeyboardEvent("Enter");

      await act(async () => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(onRowCommit).toHaveBeenCalled();
      expect(onRowCreate).not.toHaveBeenCalled();
    });
  });

  describe("Escape key handling", () => {
    it("should close inspector when open", () => {
      const onInspectorClose = vi.fn();
      const onCancel = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          isInspectorOpen: true,
          onInspectorClose,
          onCancel,
        })
      );

      const event = createKeyboardEvent("Escape");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onInspectorClose).toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled(); // Inspector close takes priority
    });

    it("should cancel editing when not in inspector mode", () => {
      const onCancel = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onCancel, isInspectorOpen: false })
      );

      // Start editing first
      act(() => {
        result.current.startEditing();
      });

      expect(result.current.focusState.isEditing).toBe(true);

      const event = createKeyboardEvent("Escape");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(onCancel).toHaveBeenCalled();
      expect(result.current.focusState.isEditing).toBe(false);
    });

    it("should call general cancel when not editing and inspector closed", () => {
      const onCancel = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ onCancel, isInspectorOpen: false })
      );

      const event = createKeyboardEvent("Escape");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("Undo key handling (Cmd/Ctrl+Z)", () => {
    it("should call onUndo when Cmd+Z is pressed (Mac)", () => {
      const onUndo = vi.fn();
      const { result } = renderHook(() => useWorkSurfaceKeyboard({ onUndo }));

      const event = createKeyboardEvent("z", { metaKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onUndo).toHaveBeenCalled();
    });

    it("should call onUndo when Ctrl+Z is pressed (Windows/Linux)", () => {
      const onUndo = vi.fn();
      const { result } = renderHook(() => useWorkSurfaceKeyboard({ onUndo }));

      const event = createKeyboardEvent("z", { ctrlKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onUndo).toHaveBeenCalled();
    });

    it("should not call onUndo for Shift+Z (redo)", () => {
      const onUndo = vi.fn();
      const { result } = renderHook(() => useWorkSurfaceKeyboard({ onUndo }));

      const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe("Tab navigation in grid mode", () => {
    it("should not prevent default in grid mode (let AG Grid handle)", () => {
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ gridMode: true })
      );

      const event = createKeyboardEvent("Tab");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Tab navigation in non-grid mode", () => {
    let container: HTMLDivElement;
    let buttons: HTMLButtonElement[];

    beforeEach(() => {
      // Create a mock DOM structure
      container = document.createElement("div");
      buttons = [];
      for (let i = 0; i < 3; i++) {
        const btn = document.createElement("button");
        btn.textContent = `Button ${i + 1}`;
        buttons.push(btn);
        container.appendChild(btn);
      }
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it("should expose focusFirst and focusLast utilities", () => {
      const containerRef = { current: container } as React.RefObject<HTMLElement>;
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ gridMode: false, containerRef })
      );

      act(() => {
        result.current.focusFirst();
      });

      expect(document.activeElement).toBe(buttons[0]);

      act(() => {
        result.current.focusLast();
      });

      expect(document.activeElement).toBe(buttons[2]);
    });

    it("should call onTabNavigate when navigating", () => {
      const containerRef = { current: container } as React.RefObject<HTMLElement>;
      const onTabNavigate = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          gridMode: false,
          containerRef,
          onTabNavigate,
        })
      );

      // Focus first button
      buttons[0].focus();

      const event = createKeyboardEvent("Tab");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onTabNavigate).toHaveBeenCalledWith("next", buttons[1]);
    });

    it("should navigate to previous element on Shift+Tab", () => {
      const containerRef = { current: container } as React.RefObject<HTMLElement>;
      const onTabNavigate = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          gridMode: false,
          containerRef,
          onTabNavigate,
        })
      );

      // Focus second button
      buttons[1].focus();

      const event = createKeyboardEvent("Tab", { shiftKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onTabNavigate).toHaveBeenCalledWith("prev", buttons[0]);
    });

    it("should wrap around when reaching end", () => {
      const containerRef = { current: container } as React.RefObject<HTMLElement>;
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ gridMode: false, containerRef })
      );

      // Focus last button
      buttons[2].focus();

      const event = createKeyboardEvent("Tab");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(document.activeElement).toBe(buttons[0]);
    });

    it("should wrap around when reaching beginning (Shift+Tab)", () => {
      const containerRef = { current: container } as React.RefObject<HTMLElement>;
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({ gridMode: false, containerRef })
      );

      // Focus first button
      buttons[0].focus();

      const event = createKeyboardEvent("Tab", { shiftKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(document.activeElement).toBe(buttons[2]);
    });
  });

  describe("custom handlers", () => {
    it("should call custom handler for registered key combination", () => {
      const customHandler = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          customHandlers: {
            "ctrl+s": customHandler,
          },
        })
      );

      const event = createKeyboardEvent("s", { ctrlKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(customHandler).toHaveBeenCalledWith(event);
    });

    it("should prioritize custom handlers over default handlers", () => {
      const customEscapeHandler = vi.fn();
      const onCancel = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          onCancel,
          customHandlers: {
            escape: customEscapeHandler,
          },
        })
      );

      const event = createKeyboardEvent("Escape");

      act(() => {
        result.current.keyboardProps.onKeyDown(event);
      });

      expect(customEscapeHandler).toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should not handle any keys when disabled", () => {
      const onCancel = vi.fn();
      const onUndo = vi.fn();
      const { result } = renderHook(() =>
        useWorkSurfaceKeyboard({
          onCancel,
          onUndo,
          disabled: true,
        })
      );

      const escEvent = createKeyboardEvent("Escape");
      const undoEvent = createKeyboardEvent("z", { metaKey: true });

      act(() => {
        result.current.keyboardProps.onKeyDown(escEvent);
        result.current.keyboardProps.onKeyDown(undoEvent);
      });

      expect(onCancel).not.toHaveBeenCalled();
      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe("focus management functions", () => {
    it("should update focus state with setFocus", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      act(() => {
        result.current.setFocus(5, 3);
      });

      expect(result.current.focusState).toEqual({
        row: 5,
        col: 3,
        isEditing: false,
      });
    });

    it("should set isEditing true with startEditing", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.focusState.isEditing).toBe(true);
    });

    it("should set isEditing false with stopEditing", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.focusState.isEditing).toBe(true);

      act(() => {
        result.current.stopEditing();
      });

      expect(result.current.focusState.isEditing).toBe(false);
    });

    it("should reset all focus state with resetFocus", () => {
      const { result } = renderHook(() => useWorkSurfaceKeyboard({}));

      act(() => {
        result.current.setFocus(5, 3);
        result.current.startEditing();
      });

      expect(result.current.focusState).toEqual({
        row: 5,
        col: 3,
        isEditing: true,
      });

      act(() => {
        result.current.resetFocus();
      });

      expect(result.current.focusState).toEqual({
        row: null,
        col: null,
        isEditing: false,
      });
    });
  });
});
