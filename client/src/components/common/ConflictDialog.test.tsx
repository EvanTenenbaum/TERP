/**
 * ST-026: ConflictDialog Tests
 *
 * Tests for the concurrent edit conflict resolution UI component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConflictDialog, useConflictDetection } from "./ConflictDialog";
import { renderHook, act } from "@testing-library/react";

describe("ConflictDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onRefresh: vi.fn(),
    onDiscard: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default message when open", () => {
    render(<ConflictDialog {...defaultProps} />);

    expect(screen.getByText("Concurrent Edit Detected")).toBeInTheDocument();
    expect(screen.getByText(/was modified by another user/)).toBeInTheDocument();
  });

  it("renders with custom entity type", () => {
    render(<ConflictDialog {...defaultProps} entityType="Order" />);

    expect(screen.getByText(/This order was modified/i)).toBeInTheDocument();
  });

  it("renders custom message when provided", () => {
    const customMessage = "Custom conflict message for testing";
    render(<ConflictDialog {...defaultProps} message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("displays version information when provided", () => {
    render(
      <ConflictDialog
        {...defaultProps}
        entityType="Order"
        entityId={123}
        yourVersion={1}
        currentVersion={2}
      />
    );

    expect(screen.getByText(/Your version: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Server version: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Order #123/)).toBeInTheDocument();
  });

  it("calls onRefresh and closes dialog when Refresh is clicked", async () => {
    const onRefresh = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConflictDialog
        {...defaultProps}
        onRefresh={onRefresh}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByText("Refresh"));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onDiscard and closes dialog when Discard Changes is clicked", async () => {
    const onDiscard = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConflictDialog
        {...defaultProps}
        onDiscard={onDiscard}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByText("Discard Changes"));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render Force Overwrite button when handler not provided", () => {
    render(<ConflictDialog {...defaultProps} />);

    expect(screen.queryByText("Force Overwrite")).not.toBeInTheDocument();
  });

  it("renders Force Overwrite button when handler is provided", () => {
    render(
      <ConflictDialog {...defaultProps} onForceOverwrite={vi.fn()} />
    );

    expect(screen.getByText("Force Overwrite")).toBeInTheDocument();
  });

  it("shows warning dialog when Force Overwrite is clicked", async () => {
    render(
      <ConflictDialog {...defaultProps} onForceOverwrite={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Force Overwrite"));

    await waitFor(() => {
      expect(screen.getByText("Warning: Force Overwrite")).toBeInTheDocument();
    });

    expect(screen.getByText(/You are about to overwrite/)).toBeInTheDocument();
    expect(screen.getByText("Yes, Overwrite")).toBeInTheDocument();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });

  it("calls onForceOverwrite when confirmed", async () => {
    const onForceOverwrite = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConflictDialog
        {...defaultProps}
        onForceOverwrite={onForceOverwrite}
        onOpenChange={onOpenChange}
      />
    );

    // Click Force Overwrite to show warning
    fireEvent.click(screen.getByText("Force Overwrite"));

    await waitFor(() => {
      expect(screen.getByText("Yes, Overwrite")).toBeInTheDocument();
    });

    // Confirm force overwrite
    fireEvent.click(screen.getByText("Yes, Overwrite"));

    expect(onForceOverwrite).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("returns to main dialog when Go Back is clicked in warning", async () => {
    render(
      <ConflictDialog {...defaultProps} onForceOverwrite={vi.fn()} />
    );

    // Click Force Overwrite to show warning
    fireEvent.click(screen.getByText("Force Overwrite"));

    await waitFor(() => {
      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });

    // Click Go Back
    fireEvent.click(screen.getByText("Go Back"));

    // Should be back to main dialog
    await waitFor(() => {
      expect(screen.getByText("Concurrent Edit Detected")).toBeInTheDocument();
    });
  });

  it("disables buttons when loading", () => {
    render(
      <ConflictDialog
        {...defaultProps}
        isLoading={true}
        onForceOverwrite={vi.fn()}
      />
    );

    expect(screen.getByText("Discard Changes").closest("button")).toBeDisabled();
    expect(screen.getByText("Force Overwrite").closest("button")).toBeDisabled();
    expect(screen.getByText("Loading...").closest("button")).toBeDisabled();
  });

  it("does not render when not open", () => {
    render(<ConflictDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("Concurrent Edit Detected")).not.toBeInTheDocument();
  });
});

describe("useConflictDetection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with no conflict", () => {
    const { result } = renderHook(() => useConflictDetection());

    expect(result.current.isConflict).toBe(false);
    expect(result.current.conflictInfo).toBeNull();
  });

  it("detects CONFLICT error from tRPC", () => {
    const { result } = renderHook(() => useConflictDetection());

    const error = {
      data: { code: "CONFLICT" },
      message:
        "Order #123 has been modified by another user. Your version: 1, Current version: 2. Please refresh and try again.",
    };

    act(() => {
      const detected = result.current.handleError(error);
      expect(detected).toBe(true);
    });

    expect(result.current.isConflict).toBe(true);
    expect(result.current.conflictInfo).toEqual({
      entityType: "Order",
      entityId: 123,
      yourVersion: 1,
      currentVersion: 2,
      message: error.message,
    });
  });

  it("detects conflict by message content even without CONFLICT code", () => {
    const { result } = renderHook(() => useConflictDetection());

    const error = {
      message:
        "Client #456 has been modified by another user. Your version: 5, Current version: 6.",
    };

    act(() => {
      const detected = result.current.handleError(error);
      expect(detected).toBe(true);
    });

    expect(result.current.isConflict).toBe(true);
    expect(result.current.conflictInfo?.entityType).toBe("Client");
    expect(result.current.conflictInfo?.entityId).toBe(456);
    expect(result.current.conflictInfo?.yourVersion).toBe(5);
    expect(result.current.conflictInfo?.currentVersion).toBe(6);
  });

  it("returns false for non-conflict errors", () => {
    const { result } = renderHook(() => useConflictDetection());

    const error = {
      data: { code: "NOT_FOUND" },
      message: "Record not found",
    };

    act(() => {
      const detected = result.current.handleError(error);
      expect(detected).toBe(false);
    });

    expect(result.current.isConflict).toBe(false);
    expect(result.current.conflictInfo).toBeNull();
  });

  it("resets conflict state", () => {
    const { result } = renderHook(() => useConflictDetection());

    // Set conflict
    act(() => {
      result.current.handleError({
        data: { code: "CONFLICT" },
        message: "Order #1 has been modified by another user. Your version: 1, Current version: 2.",
      });
    });

    expect(result.current.isConflict).toBe(true);

    // Reset
    act(() => {
      result.current.resetConflict();
    });

    expect(result.current.isConflict).toBe(false);
    expect(result.current.conflictInfo).toBeNull();
  });

  it("handles malformed error message gracefully with CONFLICT code", () => {
    const { result } = renderHook(() => useConflictDetection());

    // CONFLICT code triggers detection even without version info in message
    const error = {
      data: { code: "CONFLICT" },
      message: "Something went wrong with concurrent edit - has been modified by another user",
    };

    act(() => {
      const detected = result.current.handleError(error);
      expect(detected).toBe(true); // CONFLICT code or message pattern triggers detection
    });

    // Should have default values when pattern doesn't match
    expect(result.current.isConflict).toBe(true);
    expect(result.current.conflictInfo?.entityType).toBe("Record");
    expect(result.current.conflictInfo?.entityId).toBe(0);
  });

  it("does not detect non-conflict errors", () => {
    const { result } = renderHook(() => useConflictDetection());

    const error = {
      data: { code: "INTERNAL_SERVER_ERROR" },
      message: "Database connection failed",
    };

    act(() => {
      const detected = result.current.handleError(error);
      expect(detected).toBe(false);
    });

    expect(result.current.isConflict).toBe(false);
  });

  it("handles null error gracefully", () => {
    const { result } = renderHook(() => useConflictDetection());

    act(() => {
      const detected = result.current.handleError(null);
      expect(detected).toBe(false);
    });

    expect(result.current.isConflict).toBe(false);
  });

  it("allows manual setting of conflict state", () => {
    const { result } = renderHook(() => useConflictDetection());

    act(() => {
      result.current.setIsConflict(true);
    });

    expect(result.current.isConflict).toBe(true);
  });
});
