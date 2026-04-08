import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { SimpleDashboard } from "./SimpleDashboard";
import { DASHBOARD_ACTIVITY_STORAGE_KEY } from "./dashboardActivity";

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
    orders: {
      getAll: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 5001,
                orderNumber: "O-5001",
                orderType: "SALE",
                isDraft: false,
                fulfillmentStatus: "READY_FOR_PACKING",
                createdAt: "2026-04-08T10:00:00.000Z",
                client: { name: "Acme Wellness" },
              },
              {
                id: 5002,
                orderNumber: "O-5002",
                orderType: "SALE",
                isDraft: false,
                fulfillmentStatus: "PACKED",
                createdAt: "2026-04-08T09:30:00.000Z",
                client: { name: "Harbor" },
              },
            ],
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
              {
                id: 901,
                poNumber: "PO-901",
                purchaseOrderStatus: "CONFIRMED",
                expectedDeliveryDate: "2026-04-09",
                updatedAt: "2026-04-08T08:45:00.000Z",
              },
              {
                id: 902,
                poNumber: "PO-902",
                purchaseOrderStatus: "SENT",
                expectedDeliveryDate: "2026-04-10",
                updatedAt: "2026-04-08T07:45:00.000Z",
              },
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
            requests: [
              {
                id: 777,
                clientName: "Northwind",
                requestedSlot: "2026-04-08T14:00:00.000Z",
                status: "approved",
              },
            ],
          },
          isLoading: false,
        }),
      },
    },
    accounting: {
      payments: {
        list: {
          useQuery: () => ({
            data: {
              items: [
                {
                  id: 42,
                  paymentNumber: "PMT-RCV-2026-000042",
                  paymentType: "RECEIVED",
                  amount: "2400",
                  createdAt: "2026-04-08T09:45:00.000Z",
                  paymentDate: "2026-04-08",
                },
              ],
            },
            isLoading: false,
          }),
        },
      },
    },
  },
}));

describe("SimpleDashboard", () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_ACTIVITY_STORAGE_KEY,
      "2026-04-08T08:00:00.000Z"
    );
  });

  it("routes the Today's Sales shortcut to the sales orders tab", () => {
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

  it("shows operational KPIs and recent activity since the last dashboard visit", async () => {
    render(<SimpleDashboard />);

    expect(screen.getByText(/operational kpis/i)).toBeInTheDocument();
    expect(screen.getByText(/expected deliveries/i)).toBeInTheDocument();
    expect(screen.getByText(/pending fulfillment/i)).toBeInTheDocument();
    expect(screen.getByText(/appointments today/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/since last dashboard visit/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/new order o-5001/i)).toBeInTheDocument();
    expect(
      screen.getByText(/payment received pmt-rcv-2026-000042/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/intake activity po-901/i)).toBeInTheDocument();
  });
});
