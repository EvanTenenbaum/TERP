/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ClientProfilePage from "./ClientProfilePage";
import { RELATIONSHIP_ROLE_TOKENS } from "@/lib/statusTokens";

const mockSetLocation = vi.fn();

const shellData = {
  name: "North Farm",
  teriCode: "NF-10",
  email: "ops@northfarm.test",
  phone: "555-0100",
  address: "10 Market St",
  paymentTermsDays: 30,
  wishlist: null,
  roles: ["Customer", "Supplier"],
  referrer: null,
  tags: [],
  alerts: [],
  vipPortalEnabled: false,
  vipPortalLastLogin: null,
  lastTouchAt: "2026-04-01T00:00:00.000Z",
  openArtifacts: {
    orderDrafts: 0,
    salesSheetDrafts: 0,
    openQuotes: 0,
  },
  financials: {
    balance: {
      computedBalance: 0,
      storedBalance: 0,
      discrepancy: 0,
    },
    creditLimit: 0,
    lifetimeValue: 0,
    profitability: 0,
    averageMarginPercent: 0,
    moneySummary: null,
  },
};

vi.mock("wouter", () => ({
  useParams: () => ({ id: "10" }),
  useSearch: () => "?section=overview",
  useLocation: () => ["/clients/10?section=overview", mockSetLocation],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/useCreditVisibility", () => ({
  useCreditVisibility: () => ({
    shouldShowCreditWidgetInProfile: false,
  }),
}));

vi.mock("@/components/layout/LinearWorkspaceShell", () => ({
  LinearWorkspaceShell: ({
    children,
    title,
    description,
  }: {
    children: ReactNode;
    title: string;
    description: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
  LinearWorkspacePanel: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (value === "overview" ? <div>{children}</div> : null),
}));

vi.mock("@/components/clients/AddCommunicationModal", () => ({
  AddCommunicationModal: () => null,
}));
vi.mock("@/components/clients/ClientCalendarTab", () => ({
  ClientCalendarTab: () => null,
}));
vi.mock("@/components/clients/CommunicationTimeline", () => ({
  CommunicationTimeline: () => null,
}));
vi.mock("@/components/clients/PaymentFollowUpPanel", () => ({
  PaymentFollowUpPanel: () => null,
}));
vi.mock("@/components/clients/SupplierProfileSection", () => ({
  SupplierProfileSection: () => null,
}));
vi.mock("@/components/clients/VIPPortalSettings", () => ({
  VIPPortalSettings: () => null,
}));
vi.mock("@/components/comments/CommentWidget", () => ({
  CommentWidget: () => null,
}));
vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <button type="button">Back</button>,
}));
vi.mock("@/components/credit/CreditStatusCard", () => ({
  CreditStatusCard: () => null,
}));
vi.mock("@/components/dashboard/widgets-v2", () => ({
  FreeformNoteWidget: () => null,
}));
vi.mock("@/components/needs/ClientNeedsTab", () => ({
  ClientNeedsTab: () => null,
}));
vi.mock("@/components/pricing/PricingConfigTab", () => ({
  PricingConfigTab: () => null,
}));
vi.mock("@/components/vip-portal/LiveCatalogConfig", () => ({
  LiveCatalogConfig: () => null,
}));
vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/skeleton-loaders", () => ({
  PageSkeleton: () => <div>Loading</div>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      relationshipProfile: {
        getShell: { invalidate: vi.fn() },
        getActivity: { invalidate: vi.fn() },
      },
      clients: {
        getById: { invalidate: vi.fn() },
        list: { invalidate: vi.fn() },
      },
    }),
    relationshipProfile: {
      getShell: {
        useQuery: () => ({
          data: shellData,
          isLoading: false,
        }),
      },
      getSalesPricing: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
      getMoney: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
      getSupplyInventory: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
      getActivity: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
    },
    clients: {
      notes: {
        getNoteId: {
          useQuery: () => ({ data: null, isLoading: false }),
        },
      },
      update: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      transactions: {
        update: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
    clientLedger: {
      addLedgerAdjustment: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

describe("ClientProfilePage", () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
  });

  it("renders semantic relationship role badges inside the profile header", () => {
    render(<ClientProfilePage />);

    const customerBadge = screen.getByTestId("relationship-role-badge-Customer");
    const supplierBadge = screen.getByTestId("relationship-role-badge-Supplier");

    expect(customerBadge).toBeInTheDocument();
    expect(customerBadge.className).toContain(
      RELATIONSHIP_ROLE_TOKENS.Customer
    );
    expect(supplierBadge).toBeInTheDocument();
    expect(supplierBadge.className).toContain(
      RELATIONSHIP_ROLE_TOKENS.Supplier
    );
  });
});
