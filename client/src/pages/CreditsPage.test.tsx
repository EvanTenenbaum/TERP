/**
 * CreditsPage scaling regression tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CreditsPage from "./CreditsPage";

const { mockClientsListUseQuery } = vi.hoisted(() => ({
  mockClientsListUseQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    credits: {
      list: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      getSummary: {
        useQuery: () => ({
          data: {
            totalCreditsRemaining: 0,
            creditCount: 0,
            totalIssued: 0,
            totalApplied: 0,
            expiringWithin30Days: {
              count: 0,
              totalAmount: 0,
            },
          },
        }),
      },
      issue: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      applyCredit: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      void: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
    clients: {
      list: {
        useQuery: mockClientsListUseQuery,
      },
    },
  },
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: () => <div data-testid="client-combobox" />,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <div>Back</div>,
}));

describe("CreditsPage", () => {
  beforeEach(() => {
    mockClientsListUseQuery.mockReset();
    mockClientsListUseQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
  });

  it("loads a full client list for searchable credit assignment", () => {
    render(<CreditsPage embedded />);

    expect(mockClientsListUseQuery).toHaveBeenCalledWith({ limit: 1000 });
    expect(screen.getByText("Issued Credit Adjustments")).toBeInTheDocument();
  });
});
