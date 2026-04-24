/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientCommitContextCard } from "./ClientCommitContextCard";

const openMoney = vi.fn();
const openPricing = vi.fn();
const openOverview = vi.fn();

const shellData = {
  name: "Acme Wellness",
  lastTouchAt: new Date().toISOString(),
  roles: ["Customer", "Supplier"],
  referrer: { name: "North Farm" },
  openArtifacts: {
    salesSheetDrafts: 2,
    orderDrafts: 1,
    openQuotes: 3,
    activeNeeds: 1,
  },
};

const recentOrdersData = {
  success: true,
  orders: [
    {
      id: 42,
      orderNumber: "SO-0042",
      total: "1250.00",
      createdAt: "2026-04-06T00:00:00.000Z",
      confirmedAt: "2026-04-06T10:00:00.000Z",
    },
  ],
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    relationshipProfile: {
      getShell: {
        useQuery: vi.fn(() => ({
          data: shellData,
          isLoading: false,
        })),
      },
    },
    orderEnhancements: {
      getRecentOrdersForReorder: {
        useQuery: vi.fn(() => ({
          data: recentOrdersData,
        })),
      },
    },
  },
}));

describe("ClientCommitContextCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders open work and recent sales context", () => {
    render(
      <ClientCommitContextCard
        clientId={1}
        canViewPricingContext={true}
        onOpenMoney={openMoney}
        onOpenPricing={openPricing}
        onOpenOverview={openOverview}
      />
    );

    expect(screen.getByText("Customer Context")).toBeInTheDocument();
    expect(screen.getByText("Acme Wellness")).toBeInTheDocument();
    expect(screen.getByText("Open Quotes")).toBeInTheDocument();
    expect(screen.getByText("Referred by North Farm")).toBeInTheDocument();
    expect(screen.getByText("SO-0042")).toBeInTheDocument();
    expect(screen.getByText("$1,250")).toBeInTheDocument();
  });

  it("wires quick actions and respects pricing access", () => {
    render(
      <ClientCommitContextCard
        clientId={1}
        canViewPricingContext={false}
        onOpenMoney={openMoney}
        onOpenPricing={openPricing}
        onOpenOverview={openOverview}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /overview/i }));
    fireEvent.click(screen.getByRole("button", { name: /money/i }));

    expect(openOverview).toHaveBeenCalledTimes(1);
    expect(openMoney).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /pricing/i })).toBeDisabled();
  });
});
