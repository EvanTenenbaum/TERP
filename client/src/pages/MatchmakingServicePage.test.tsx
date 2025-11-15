/**
 * MatchmakingServicePage Tests
 *
 * Tests for the Matchmaking Service page, specifically testing that
 * the Add Need and Add Supply buttons navigate to the correct routes.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchmakingServicePage from "./MatchmakingServicePage";

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["", mockSetLocation],
}));

// Mock the trpc hooks
vi.mock("@/lib/trpc", () => ({
  trpc: {
    clientNeeds: {
      getAllWithMatches: {
        useQuery: () => ({
          data: {
            data: [
              {
                id: 1,
                clientNeedId: 1,
                clientId: 1,
                clientName: "Test Client",
                strain: "Test Strain",
                productName: "Test Product",
                category: "Flower",
                priority: "HIGH",
                status: "ACTIVE",
                matchCount: 2,
              },
            ],
          },
          isLoading: false,
        }),
      },
    },
    vendorSupply: {
      getAllWithMatches: {
        useQuery: () => ({
          data: {
            data: [
              {
                id: 1,
                vendorId: 1,
                vendorName: "Test Vendor",
                strain: "Test Strain",
                productName: "Test Product",
                category: "Flower",
                status: "AVAILABLE",
                buyerCount: 1,
              },
            ],
          },
          isLoading: false,
        }),
      },
    },
    matching: {
      getAllActiveNeedsWithMatches: {
        useQuery: () => ({
          data: {
            data: [
              {
                clientNeedId: 1,
                clientId: 1,
                matches: [
                  {
                    vendorSupplyId: 1,
                    confidence: 85,
                    reasons: ["Strain match"],
                  },
                ],
              },
            ],
          },
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock BackButton component
vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <div data-testid="back-button">Back Button</div>,
}));

// Mock MatchBadge component
vi.mock("@/components/needs/MatchBadge", () => ({
  MatchBadge: () => <div data-testid="match-badge">Match Badge</div>,
}));

// Mock display helpers
vi.mock("@/lib/displayHelpers", () => ({
  getProductDisplayName: (item: { productName?: string }) =>
    item.productName || "Unknown Product",
}));

describe("MatchmakingServicePage - Button Navigation", () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
  });

  it("should render the page with Add Need and Add Supply buttons", () => {
    render(<MatchmakingServicePage />);

    expect(
      screen.getByRole("button", { name: /add need/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add supply/i })
    ).toBeInTheDocument();
  });

  it("should navigate to /clients when Add Need button is clicked", () => {
    render(<MatchmakingServicePage />);

    const addNeedButton = screen.getByRole("button", { name: /add need/i });
    fireEvent.click(addNeedButton);

    expect(mockSetLocation).toHaveBeenCalledWith("/clients");
  });

  it("should navigate to /vendor-supply when Add Supply button is clicked", () => {
    render(<MatchmakingServicePage />);

    const addSupplyButton = screen.getByRole("button", { name: /add supply/i });
    fireEvent.click(addSupplyButton);

    expect(mockSetLocation).toHaveBeenCalledWith("/vendor-supply");
  });

  it("should not navigate to non-existent routes", () => {
    render(<MatchmakingServicePage />);

    const addNeedButton = screen.getByRole("button", { name: /add need/i });
    const addSupplyButton = screen.getByRole("button", { name: /add supply/i });

    fireEvent.click(addNeedButton);
    expect(mockSetLocation).not.toHaveBeenCalledWith("/needs/new");

    fireEvent.click(addSupplyButton);
    expect(mockSetLocation).not.toHaveBeenCalledWith("/supply/new");
  });
});
