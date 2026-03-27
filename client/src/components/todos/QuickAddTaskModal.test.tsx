/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickAddTaskModal } from "./QuickAddTaskModal";

const mockUseQuery = vi.fn();
const mockUseContext = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    (props, ref) => <input ref={ref} {...props} />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock("lucide-react", () => ({
  Zap: () => <span data-testid="zap-icon" />,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    todoLists: {
      getMyLists: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
    todoTasks: {
      create: {
        useMutation: (...args: unknown[]) => mockUseMutation(...args),
      },
    },
    useContext: () => mockUseContext(),
  },
}));

describe("QuickAddTaskModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuery.mockReturnValue({
      data: { items: [{ id: 1, name: "Default List" }] },
      isLoading: false,
    });

    mockUseContext.mockReturnValue({
      todoTasks: { invalidate: vi.fn() },
      todoLists: { invalidate: vi.fn() },
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("keeps the lists query disabled while closed and enables it on open", () => {
    const { rerender } = render(
      <QuickAddTaskModal isOpen={false} onClose={() => {}} />
    );

    expect(mockUseQuery).toHaveBeenCalledWith(undefined, { enabled: false });

    rerender(<QuickAddTaskModal isOpen onClose={() => {}} />);

    expect(mockUseQuery).toHaveBeenLastCalledWith(undefined, { enabled: true });
  });

  it("shows a loading message instead of the empty state while lists are loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<QuickAddTaskModal isOpen onClose={() => {}} />);

    expect(mockUseQuery).toHaveBeenCalledWith(undefined, { enabled: true });
    expect(screen.getByText("Loading lists...")).toBeInTheDocument();
    expect(
      screen.queryByText("No lists yet. Create one first!")
    ).not.toBeInTheDocument();
  });
});
