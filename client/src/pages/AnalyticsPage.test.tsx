/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./AnalyticsPage";

const mockSetLocation = vi.fn();

let mockDisplaySettings = {
  display: {
    canViewCogsData: false,
    cogsDisplayMode: "ADMIN_ONLY",
    showCogsInOrders: false,
    showMarginInOrders: false,
  },
};

vi.mock("wouter", () => ({
  useLocation: () => ["/analytics", mockSetLocation],
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <button type="button">{children ?? value}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/analytics", () => ({
  MetricCard: ({
    title,
    value,
    subtitle,
  }: {
    title: string;
    value: string;
    subtitle?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{value}</p>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  ),
  TopClientsTable: () => <div>Top clients table</div>,
  RevenueTrendsTable: () => <div>Revenue trends table</div>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    analytics: {
      getExtendedSummary: {
        useQuery: () => ({
          data: {
            totalRevenue: 1000,
            totalOrders: 10,
            totalClients: 4,
            totalInventoryItems: 12,
            averageOrderValue: 100,
            totalPaymentsReceived: 500,
            outstandingBalance: 500,
            profitMargin: 25,
            growthRate: 5,
            ordersThisPeriod: 3,
            revenueThisPeriod: 300,
            newClientsThisPeriod: 1,
            totalInventoryValue: 750,
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getRevenueTrends: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
      getTopClients: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
      exportData: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    organizationSettings: {
      getDisplaySettings: {
        useQuery: () => ({
          data: mockDisplaySettings,
        }),
      },
    },
  },
}));

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisplaySettings = {
      display: {
        canViewCogsData: false,
        cogsDisplayMode: "ADMIN_ONLY",
        showCogsInOrders: false,
        showMarginInOrders: false,
      },
    };
  });

  it("hides inventory value when the viewer lacks cost access", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("Total Batches")).toBeInTheDocument();
    expect(screen.queryByText("Inventory Value")).not.toBeInTheDocument();
  });

  it("shows inventory value when the viewer has cost access", () => {
    mockDisplaySettings = {
      display: {
        canViewCogsData: true,
        cogsDisplayMode: "ADMIN_ONLY",
        showCogsInOrders: true,
        showMarginInOrders: true,
      },
    };

    render(<AnalyticsPage />);

    expect(screen.getByText("Inventory Value")).toBeInTheDocument();
    expect(screen.getByText("$750.00")).toBeInTheDocument();
  });
});
