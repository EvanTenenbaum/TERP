import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VIPDashboard from "./VIPDashboard";

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
    isInitialized: true,
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
          useQuery: vi.fn(() => ({ data: { invoices: [] }, isLoading: false })),
        },
      },
      ap: {
        getBills: {
          useQuery: vi.fn(() => ({ data: { bills: [] }, isLoading: false })),
        },
      },
      notifications: {
        list: {
          useQuery: vi.fn(() => ({
            data: { items: [], unreadCount: 0 },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        markRead: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        markAllRead: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
      },
      documents: {
        downloadInvoicePdf: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn(),
            isPending: false,
          })),
        },
        downloadBillPdf: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
    vipTiers: {
      getClientStatusDetailed: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          isError: false,
        })),
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

  it("renders loading state while data is loading", () => {
    mockConfigQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockKpiQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<VIPDashboard />);

    expect(screen.getByText("Loading your portal...")).toBeInTheDocument();
  });

  it("renders dashboard KPIs with correct values", () => {
    const kpiData = {
      currentBalance: 12500,
      ytdSpend: 82500,
      creditUtilization: 32,
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

    expect(screen.getByText("$12,500")).toBeInTheDocument();
    expect(screen.getByText("$82,500")).toBeInTheDocument();
    expect(screen.getByText("32%")).toBeInTheDocument();
  });

  it("shows welcome message when greeting is enabled", () => {
    mockConfigQuery.mockReturnValue({
      data: baseConfig,
      isLoading: false,
    });
    mockKpiQuery.mockReturnValue({
      data: {
        currentBalance: 1000,
        ytdSpend: 5000,
        creditUtilization: 10,
        activeNeedsCount: 1,
        activeSupplyCount: 2,
      },
      isLoading: false,
    });

    render(<VIPDashboard />);

    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
  });
});
