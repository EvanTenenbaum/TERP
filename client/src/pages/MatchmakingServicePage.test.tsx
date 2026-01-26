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

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// BUG-108: Mock tRPC with all required hooks including useUtils
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      clientNeeds: {
        getAllWithMatches: { invalidate: vi.fn() },
      },
      vendorSupply: {
        getAllWithMatches: { invalidate: vi.fn() },
      },
      matching: {
        getAllActiveNeedsWithMatches: { invalidate: vi.fn() },
      },
    }),
    clientNeeds: {
      getAllWithMatches: {
        useQuery: () => ({
          data: { needs: [], totalCount: 0 },
          isLoading: false,
          error: null,
        }),
      },
    },
    vendorSupply: {
      getAllWithMatches: {
        useQuery: () => ({
          data: { items: [], totalCount: 0 },
          isLoading: false,
          error: null,
        }),
      },
      reserve: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    matching: {
      getAllActiveNeedsWithMatches: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      findMatchesForVendorSupply: {
        useQuery: () => ({
          data: { matches: [] },
          isLoading: false,
          error: null,
        }),
      },
      reserveVendorSupply: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
      dismissMatch: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
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
