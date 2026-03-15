import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { SimpleDashboard } from "./SimpleDashboard";

const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation] as const,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    dashboard: {
      getTransactionSnapshot: {
        useQuery: () => ({
          data: {
            today: {
              sales: 1383.82,
              unitsSold: 4,
              cashCollected: 186016,
            },
            thisWeek: {
              sales: 4123.5,
            },
          },
          isLoading: false,
        }),
      },
      getTotalDebt: {
        useQuery: () => ({
          data: {
            totalDebtOwedToMe: 963104,
          },
          isLoading: false,
        }),
      },
    },
    inventory: {
      dashboardStats: {
        useQuery: () => ({
          data: {
            statusCounts: {
              LIVE: 178,
              QUARANTINED: 9,
              ON_HOLD: 9,
            },
          },
          isLoading: false,
        }),
      },
    },
    purchaseOrders: {
      getAll: {
        useQuery: () => ({
          data: {
            items: [
              { purchaseOrderStatus: "CONFIRMED" },
              { purchaseOrderStatus: "SENT" },
            ],
          },
          isLoading: false,
        }),
      },
    },
    appointmentRequests: {
      list: {
        useQuery: () => ({
          data: {
            requests: [],
          },
          isLoading: false,
        }),
      },
    },
  },
}));

describe("SimpleDashboard", () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
  });

  it("routes the Today's Orders shortcut to the sales orders tab", () => {
    render(<SimpleDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /view orders/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      buildSalesWorkspacePath("orders")
    );
  });

  it("routes the Pending Intake shortcut to the canonical purchase orders workspace", () => {
    render(<SimpleDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /view pos/i }));

    expect(mockSetLocation).toHaveBeenCalledWith("/purchase-orders");
  });
});
