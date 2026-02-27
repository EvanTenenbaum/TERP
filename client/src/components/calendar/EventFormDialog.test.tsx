/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// TEST-022: Radix primitives are mocked in this suite to avoid jsdom rendering
// instability while preserving behavior-level form coverage.

// Mock all UI components to avoid Radix UI ref issues
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
  useDialogComposition: () => ({
    isComposing: () => false,
    setComposing: () => {},
    justEndedComposing: () => false,
    markCompositionEnd: () => {},
  }),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      id={id}
      data-testid={id ? `checkbox-${id}` : "checkbox"}
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/components/ui/input", () => {
  const React = require("react");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Input: React.forwardRef((props: any, ref: any) => (
      <input ref={ref} {...props} />
    )),
  };
});

vi.mock("@/components/ui/textarea", () => {
  const React = require("react");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Textarea: React.forwardRef((props: any, ref: any) => (
      <textarea ref={ref} {...props} />
    )),
  };
});

vi.mock("@/components/ui/label", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/button", () => {
  const React = require("react");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
  };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select">{children}</div>
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

// Use vi.hoisted for tRPC mocks
const {
  mockMutateAsync,
  mockCreateMutation,
  mockUpdateMutation,
  mockGetEventById,
  mockListUsersQuery,
  mockListClientsQuery,
  mockListCalendarsQuery,
} = vi.hoisted(() => {
  const mockMutateAsync = vi.fn();
  const usersQueryResult = { data: [], isLoading: false };
  const clientsQueryResult = { data: { items: [] }, isLoading: false };
  const calendarsQueryResult = {
    data: [{ id: 1, name: "Default Calendar", isDefault: true }],
    isLoading: false,
  };
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
    mockListUsersQuery: vi.fn(() => usersQueryResult),
    mockListClientsQuery: vi.fn(() => clientsQueryResult),
    mockListCalendarsQuery: vi.fn(() => calendarsQueryResult),
  };
});

vi.mock("../../lib/trpc", () => ({
  trpc: {
    calendar: {
      createEvent: { useMutation: mockCreateMutation },
      updateEvent: { useMutation: mockUpdateMutation },
      getEventById: { useQuery: mockGetEventById },
    },
    userManagement: {
      listUsers: { useQuery: mockListUsersQuery },
    },
    clients: {
      list: { useQuery: mockListClientsQuery },
    },
    calendarsManagement: {
      list: { useQuery: mockListCalendarsQuery },
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

    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Create Event"
    );
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

    const titleInput = screen.getByPlaceholderText(/event title/i);
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: "Test Event" } });
    }

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
