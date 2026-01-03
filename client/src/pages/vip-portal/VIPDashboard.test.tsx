import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VIPDashboard from "./VIPDashboard";
import { formatCurrency, formatDate } from "@/lib/utils";

const mockConfigQuery = vi.fn();
const mockKpiQuery = vi.fn();
const mockLogout = vi.fn();

vi.mock("@/hooks/useVIPPortalAuth", () => ({
  useVIPPortalAuth: vi.fn(() => ({
    clientId: 1,
    clientName: "Test Client",
    logout: mockLogout,
    isImpersonation: false,
    sessionGuid: "session-guid",
  })),
}));

vi.mock("@/components/vip-portal/AccountsReceivable", () => ({
  AccountsReceivable: vi.fn(() => <div data-testid="ar-tab">AR Content</div>),
}));

vi.mock("@/components/vip-portal/AccountsPayable", () => ({
  AccountsPayable: vi.fn(() => <div data-testid="ap-tab">AP Content</div>),
}));

vi.mock("@/components/vip-portal/MarketplaceNeeds", () => ({
  MarketplaceNeeds: vi.fn(() => <div data-testid="needs-tab">Needs</div>),
}));

vi.mock("@/components/vip-portal/MarketplaceSupply", () => ({
  MarketplaceSupply: vi.fn(() => <div data-testid="supply-tab">Supply</div>),
}));

vi.mock("@/components/vip-portal/TransactionHistory", () => ({
  TransactionHistory: vi.fn(() => (
    <div data-testid="transactions-tab">Transactions</div>
  )),
}));

vi.mock("@/components/vip-portal/Leaderboard", () => ({
  Leaderboard: vi.fn(() => (
    <div data-testid="leaderboard-tab">Leaderboard</div>
  )),
}));

vi.mock("@/components/vip-portal/LiveCatalog", () => ({
  LiveCatalog: vi.fn(() => <div data-testid="catalog-tab">Catalog</div>),
}));

vi.mock("@/components/vip-portal/ImpersonationBanner", () => ({
  ImpersonationBanner: vi.fn(() => (
    <div data-testid="impersonation-banner">Impersonation</div>
  )),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    vipPortal: {
      config: {
        get: {
          useQuery: (input: unknown, options?: unknown) =>
            mockConfigQuery(input, options),
        },
      },
      dashboard: {
        getKPIs: {
          useQuery: (input: unknown, options?: unknown) =>
            mockKpiQuery(input, options),
        },
      },
      ar: {
        getInvoices: {
          useQuery: vi.fn(),
        },
      },
      ap: {
        getBills: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

const baseConfig = {
  id: 1,
  clientId: 1,
  moduleDashboardEnabled: true,
  moduleLiveCatalogEnabled: true,
  moduleArEnabled: true,
  moduleApEnabled: true,
  moduleTransactionHistoryEnabled: true,
  moduleVipTierEnabled: true,
  moduleCreditCenterEnabled: true,
  moduleMarketplaceNeedsEnabled: true,
  moduleMarketplaceSupplyEnabled: true,
  featuresConfig: {
    dashboard: {
      showGreeting: true,
      showCurrentBalance: true,
      showYtdSpend: true,
      showQuickLinks: true,
    },
    leaderboard: {
      enabled: true,
    },
  },
  advancedOptions: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("VIPDashboard", () => {
  beforeEach(() => {
    mockConfigQuery.mockReset();
    mockKpiQuery.mockReset();
  });

  it("renders KPI skeleton placeholders while loading", () => {
    mockConfigQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockKpiQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<VIPDashboard />);

    const skeletons = screen.getAllByTestId("kpi-skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders all KPI cards with formatted values", () => {
    const kpiData = {
      currentBalance: 12500,
      ytdSpend: 82500,
      availableCredit: 7500,
      creditUtilization: 32,
      recentOrders: 14,
      nextPaymentDue: "2026-02-15T00:00:00Z",
      activeNeedsCount: 3,
      activeSupplyCount: 5,
    };

    mockConfigQuery.mockReturnValue({
      data: baseConfig,
      isLoading: false,
    });
    mockKpiQuery.mockReturnValue({
      data: kpiData,
      isLoading: false,
    });

    render(<VIPDashboard />);

    expect(
      screen.getByText(formatCurrency(kpiData.currentBalance))
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(kpiData.ytdSpend))
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(kpiData.availableCredit))
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${kpiData.creditUtilization}%`)
    ).toBeInTheDocument();
    expect(screen.getByText(`${kpiData.recentOrders}`)).toBeInTheDocument();
    expect(
      screen.getByText(formatDate(kpiData.nextPaymentDue))
    ).toBeInTheDocument();
    expect(screen.getByText(`${kpiData.activeNeedsCount}`)).toBeInTheDocument();
    expect(
      screen.getByText(`${kpiData.activeSupplyCount}`)
    ).toBeInTheDocument();
  });

  it("navigates to the appropriate tab when a KPI card is clicked", () => {
    mockConfigQuery.mockReturnValue({
      data: baseConfig,
      isLoading: false,
    });
    mockKpiQuery.mockReturnValue({
      data: {
        currentBalance: 1000,
        ytdSpend: 5000,
        availableCredit: 2000,
        creditUtilization: 10,
        recentOrders: 4,
        nextPaymentDue: "2026-01-31T00:00:00Z",
        activeNeedsCount: 1,
        activeSupplyCount: 2,
      },
      isLoading: false,
    });

    const { unmount } = render(<VIPDashboard />);

    const balanceCard = screen.getByRole("button", { name: /balance/i });
    fireEvent.click(balanceCard);
    expect(screen.getByTestId("ar-tab")).toBeInTheDocument();

    unmount();
    render(<VIPDashboard />);

    const payablesCard = screen.getByRole("button", { name: /next payment/i });
    fireEvent.click(payablesCard);
    expect(screen.getByTestId("ap-tab")).toBeInTheDocument();
  });
});
