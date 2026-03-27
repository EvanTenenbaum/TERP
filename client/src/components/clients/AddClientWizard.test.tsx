/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddClientWizard } from "./AddClientWizard";

const mockTagsUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      tags: {
        getAll: {
          useQuery: (...args: unknown[]) => mockTagsUseQuery(...args),
        },
      },
      create: {
        useMutation: () => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    useContext: () => ({
      clients: {
        list: { invalidate: vi.fn() },
        count: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("@/hooks/useUnsavedChangesWarning", () => ({
  useBeforeUnloadWarning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/ui/dialog", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...actual,
    Dialog: ({
      open,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children: React.ReactNode;
    }) => (open ? <div data-testid="add-client-dialog">{children}</div> : null),
    DialogContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
    DialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
  };
});

describe("AddClientWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTagsUseQuery.mockReturnValue({
      data: ["Preferred"],
      isLoading: false,
    });
  });

  it("resets wizard state after close and only enables tag loading while open", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <AddClientWizard
        open
        onOpenChange={onOpenChange}
        defaultRoles={{ isSeller: true }}
      />
    );

    expect(mockTagsUseQuery).toHaveBeenLastCalledWith(undefined, {
      enabled: true,
    });

    fireEvent.change(screen.getByLabelText(/teri code/i), {
      target: { value: "SUP-100" },
    });
    fireEvent.change(screen.getByLabelText(/contact name/i), {
      target: { value: "Summit Supply" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();

    rerender(
      <AddClientWizard
        open={false}
        onOpenChange={onOpenChange}
        defaultRoles={{ isSeller: true }}
      />
    );

    expect(mockTagsUseQuery).toHaveBeenLastCalledWith(undefined, {
      enabled: false,
    });

    rerender(
      <AddClientWizard
        open
        onOpenChange={onOpenChange}
        defaultRoles={{ isSeller: true }}
      />
    );

    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teri code/i)).toHaveValue("");
    expect(screen.getByLabelText(/contact name/i)).toHaveValue("");
  });
});
