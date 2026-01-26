import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// TEST-022: Mock Radix UI Dialog to avoid ref issues in jsdom
// The "Maximum update depth exceeded" error occurs due to Radix UI's
// presence/compose-refs system causing infinite loops in the test environment
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  // Provide the composition context hook used by Input component
  useDialogComposition: () => ({
    isComposing: () => false,
    setComposing: () => {},
    justEndedComposing: () => false,
    markCompositionEnd: () => {},
  }),
}));

// Mock Radix UI Select to avoid ref issues
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange: _onValueChange,
    value,
    defaultValue,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
    defaultValue?: string;
  }) => (
    <div data-testid="select" data-value={value || defaultValue}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-testid="select-trigger">
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

// Use vi.hoisted to declare mocks that can be used in vi.mock() factory
const {
  mockMutateAsync,
  mockCreateMutation,
  mockUpdateMutation,
  mockGetEventById,
  mockListUsers,
  mockClientsList,
} = vi.hoisted(() => {
  const mockMutateAsync = vi.fn();
  return {
    mockMutateAsync,
    mockCreateMutation: vi.fn(() => ({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isPending: false,
    })),
    mockUpdateMutation: vi.fn(() => ({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isPending: false,
    })),
    mockGetEventById: vi.fn(() => ({
      data: null,
      isLoading: false,
      isError: false,
    })),
    mockListUsers: vi.fn(() => ({
      data: [],
      isLoading: false,
      isError: false,
    })),
    mockClientsList: vi.fn(() => ({
      data: [],
      isLoading: false,
      isError: false,
    })),
  };
});

// Mock tRPC before importing components that use it
vi.mock("../../lib/trpc", () => ({
  trpc: {
    calendar: {
      createEvent: { useMutation: mockCreateMutation },
      updateEvent: { useMutation: mockUpdateMutation },
      getEventById: { useQuery: mockGetEventById },
    },
    userManagement: {
      listUsers: { useQuery: mockListUsers },
    },
    clients: {
      list: { useQuery: mockClientsList },
    },
    calendarsManagement: {
      list: { useQuery: () => ({ data: [], isLoading: false }) },
    },
  },
}));

import EventFormDialog from "./EventFormDialog";

describe("EventFormDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockReset();

    // Reset mock implementations
    mockCreateMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isPending: false,
    });
    mockUpdateMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isPending: false,
    });
    mockGetEventById.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    mockListUsers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockClientsList.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it("renders the form when open", () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText("Create Event")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create event/i })
    ).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <EventFormDialog
        isOpen={false}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("submits form with valid data", async () => {
    mockMutateAsync.mockResolvedValue({ id: 1 });

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    // Fill in required fields
    const titleInput =
      screen.getByLabelText(/event title/i) ||
      screen.getByPlaceholderText(/event title/i);
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: "Test Event" } });
    }

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it("shows loading state during submission", () => {
    mockCreateMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: true,
      isPending: true,
    });

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: /saving/i });
    expect(submitButton).toBeDisabled();
  });

  it("handles submission errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    mockMutateAsync.mockRejectedValue(new Error("Network error"));

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    // Fill in required fields to enable submission
    const titleInput =
      screen.getByLabelText(/event title/i) ||
      screen.getByPlaceholderText(/event title/i);
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: "Test Event" } });
    }

    const submitButton = screen.getByRole("button", { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to save event. Please try again."
      );
    });

    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("shows Edit Event title when editing", () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={123}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText("Edit Event")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update event/i })
    ).toBeInTheDocument();
  });
});
